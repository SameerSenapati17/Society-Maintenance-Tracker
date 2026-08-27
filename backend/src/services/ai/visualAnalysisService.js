import { env } from "../../config/env.js";
import { ApiError } from "../../utils/apiError.js";
import { uploadVisualArtifact } from "../cloudinaryService.js";

let mockVisualResponse = null;
let shouldMockFail = false;
const isTestEnvironment = process.env.NODE_ENV === "test" || process.argv.includes("--test");

export function setMockVisualResponse(response) {
  mockVisualResponse = response;
}

export function setMockVisualShouldFail(shouldFail) {
  shouldMockFail = Boolean(shouldFail);
}

function assertPredictionPayload(data) {
  if (!data || typeof data.category !== "string" || !data.category.trim() ||
      typeof data.confidence !== "number" || data.confidence < 0 || data.confidence > 1) {
    throw new ApiError(503, "Visual analysis service returned an invalid prediction.");
  }
  if (data.topPredictions !== undefined && !Array.isArray(data.topPredictions)) {
    throw new ApiError(503, "Visual analysis service returned an invalid prediction.");
  }
}

/**
 * Maps predicted visual categories to standard maintenance categories for multimodal synthesis.
 */
export const VISUAL_TO_MAINTENANCE_CATEGORY = {
  broken_infrastructure: "General",
  electrical_hazard: "Electrical",
  garbage_waste: "Cleaning",
  parking_road_damage: "Parking",
  wall_ceiling_damage: "General",
  "Water Leakage": "Plumbing",
  "Wall/Ceiling Damage": "General",
  "Garbage/Waste": "Cleaning",
  "Electrical Hazard": "Electrical",
  "Broken Infrastructure": "General",
  "Lift/Door Damage": "Lift",
  "Parking/Road Damage": "Parking",
  "Other": "Other"
};

/**
 * Analyzes a complaint photo using the Nivara Visual Intelligence ML microservice.
 *
 * @param {string} photoUrl - Cloudinary / image URL attached to the complaint
 * @param {Object} options
 * @returns {Promise<Object>} Normalized VisualAnalysis object
 */
export async function analyzeComplaintImage(photoUrl, options = {}) {
  if (!photoUrl || typeof photoUrl !== "string") {
    throw new ApiError(400, "A valid image URL is required for visual analysis.");
  }

  // Handle Mock / Test Mode
  if (isTestEnvironment || !env.visualAi.enabled) {
    if (shouldMockFail) {
      throw new ApiError(503, "Visual analysis service is temporarily unavailable. Please retry later.");
    }
    if (mockVisualResponse) {
      assertPredictionPayload(mockVisualResponse);
      return {
        ...mockVisualResponse,
        generatedAt: new Date()
      };
    }
    // Deterministic mock visual prediction based on photoUrl string
    const urlLower = photoUrl.toLowerCase();
    let category = "Water Leakage";
    let confidence = 0.91;
    let summary = "Highlighted regions indicate focal features most characteristic of 'Water Leakage' (91% confidence).";

    if (urlLower.includes("spark") || urlLower.includes("wire") || urlLower.includes("electric")) {
      category = "Electrical Hazard";
      confidence = 0.94;
      summary = "Highlighted regions indicate focal features characteristic of 'Electrical Hazard' (94% confidence).";
    } else if (urlLower.includes("lift") || urlLower.includes("elevator") || urlLower.includes("door")) {
      category = "Lift/Door Damage";
      confidence = 0.93;
      summary = "Highlighted regions indicate focal features characteristic of 'Lift/Door Damage' (93% confidence).";
    } else if (urlLower.includes("garbage") || urlLower.includes("waste") || urlLower.includes("trash")) {
      category = "Garbage/Waste";
      confidence = 0.89;
      summary = "Highlighted regions indicate focal features characteristic of 'Garbage/Waste' (89% confidence).";
    } else if (urlLower.includes("wall") || urlLower.includes("crack") || urlLower.includes("ceiling")) {
      category = "Wall/Ceiling Damage";
      confidence = 0.88;
      summary = "Highlighted regions indicate focal features characteristic of 'Wall/Ceiling Damage' (88% confidence).";
    }

    return {
      category,
      confidence,
      topPredictions: [
        { category, confidence },
        { category: "Wall/Ceiling Damage", confidence: 0.05 },
        { category: "Other", confidence: 0.04 }
      ],
      model: "nivara-visual-classifier",
      generatedAt: new Date(),
      overlayBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPjfDwAEeQHzc1C7VAAAAABJRU5ErkJggg==",
      heatmapBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPjfDwAEeQHzc1C7VAAAAABJRU5ErkJggg==",
      summary
    };
  }

  // Real HTTP Call to ML Microservice
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.visualAi.timeout || 15000);

  try {
    const endpoint = `${env.visualAi.url.replace(/\/$/, "")}/predict?explain=true`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        imageUrl: photoUrl,
        explain: true
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[NIVARA Visual AI Service Error]:", {
        status: response.status,
        error: errorText.slice(0, 250)
      });
      throw new ApiError(
        response.status === 422 || response.status === 400 ? 400 : 503,
        "Visual analysis service encountered an error processing the image."
      );
    }

    const data = await response.json();

    assertPredictionPayload(data);

    const visualAnalysis = {
      category: data.category,
      confidence: data.confidence,
      topPredictions: data.topPredictions || [],
      model: data.model || "nivara-visual-classifier",
      generatedAt: new Date(),
      overlayBase64: data.explanation?.overlayBase64 || null,
      heatmapBase64: data.explanation?.heatmapBase64 || null,
      overlayUrl: data.explanation?.overlayUrl || null,
      heatmapUrl: data.explanation?.heatmapUrl || null,
      detections: data.detections || [],
      summary: data.explanation?.summary || `Visual classification: ${data.category} (${Math.round(data.confidence * 100)}% confidence).`
    };

    if (process.env.NODE_ENV !== "test") {
      const artifactId = String(options.complaintId || Date.now());
      const [overlayUrl, heatmapUrl] = await Promise.all([
        visualAnalysis.overlayUrl || uploadVisualArtifact(visualAnalysis.overlayBase64, `${artifactId}-overlay`),
        visualAnalysis.heatmapUrl || uploadVisualArtifact(visualAnalysis.heatmapBase64, `${artifactId}-heatmap`)
      ]);
      visualAnalysis.overlayUrl = overlayUrl;
      visualAnalysis.heatmapUrl = heatmapUrl;
      delete visualAnalysis.overlayBase64;
      delete visualAnalysis.heatmapBase64;
    }

    return visualAnalysis;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;

    if (err.name === "AbortError") {
      console.error("[NIVARA Visual AI Timeout]: ML service did not respond within timeout period.");
      throw new ApiError(504, "Visual analysis request timed out. Please retry later.");
    }

    console.error("[NIVARA Visual AI Unreachable]:", err.message);
    throw new ApiError(503, "Visual analysis service is temporarily unavailable. Please retry later.");
  }
}
