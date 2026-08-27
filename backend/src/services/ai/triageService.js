import { env } from "../../config/env.js";
import { CATEGORY_VALUES, PRIORITY_VALUES, SEVERITY_VALUES, URGENCY_VALUES } from "../../models/Complaint.js";
import { ApiError } from "../../utils/apiError.js";
import { GeminiProvider } from "./geminiProvider.js";
import { MockAIProvider } from "./mockProvider.js";

let activeProvider = null;

export function getAIProvider() {
  if (activeProvider) return activeProvider;

  const providerType = (env.ai.provider || "").toLowerCase();

  if (providerType === "mock" || process.env.NODE_ENV === "test" || !env.ai.geminiApiKey) {
    activeProvider = new MockAIProvider();
  } else if (providerType === "gemini") {
    activeProvider = new GeminiProvider({
      apiKey: env.ai.geminiApiKey,
      model: env.ai.model,
      embeddingModel: env.ai.embeddingModel
    });
  } else {
    // Default fallback to mock provider for safety
    activeProvider = new MockAIProvider();
  }

  return activeProvider;
}

export function setAIProvider(customProvider) {
  activeProvider = customProvider;
}

function classifyProviderError(error) {
  const message = String(error?.message || "").toLowerCase();
  const status = Number(error?.status || error?.statusCode || 0);
  if (error?.code === "AI_QUOTA_EXCEEDED" || status === 429 || message.includes("quota exceeded") || message.includes("current quota") || message.includes("free_tier_requests")) return "quota_exceeded";
  if (message.includes("timed out") || message.includes("timeout") || error?.name === "AbortError") return "provider_timeout";
  if (status === 401 || status === 403 || message.includes("api key") || message.includes("authentication") || message.includes("unauthorized")) return "provider_authentication";
  if (message.includes("rate limit")) return "provider_rate_limit";
  if (message.includes("invalid") || message.includes("json") || message.includes("empty") || message.includes("non-object")) return "provider_invalid_response";
  if (status >= 500 || message.includes("unavailable") || message.includes("fetch failed")) return "provider_unavailable";
  return "validation_error";
}

/**
 * Validates that an AI output object conforms strictly to the system's enums and schema
 */
export function validateTriageOutput(data) {
  if (!data || typeof data !== "object") {
    throw new Error("AI provider returned non-object response.");
  }

  if (!CATEGORY_VALUES.includes(data.category)) {
    throw new Error(`AI returned invalid category: '${data.category}'. Allowed: ${CATEGORY_VALUES.join(", ")}`);
  }

  if (!SEVERITY_VALUES.includes(data.severity)) {
    throw new Error(`AI returned invalid severity: '${data.severity}'. Allowed: ${SEVERITY_VALUES.join(", ")}`);
  }

  if (!URGENCY_VALUES.includes(data.urgency)) {
    throw new Error(`AI returned invalid urgency: '${data.urgency}'. Allowed: ${URGENCY_VALUES.join(", ")}`);
  }

  if (!PRIORITY_VALUES.includes(data.recommendedPriority)) {
    throw new Error(`AI returned invalid priority: '${data.recommendedPriority}'. Allowed: ${PRIORITY_VALUES.join(", ")}`);
  }

  if (!data.summary || typeof data.summary !== "string" || !data.summary.trim()) {
    throw new Error("AI summary is missing or empty.");
  }

  if (!data.suggestedAction || typeof data.suggestedAction !== "string" || !data.suggestedAction.trim()) {
    throw new Error("AI suggestedAction is missing or empty.");
  }

  if (!data.reasoning || typeof data.reasoning !== "string" || !data.reasoning.trim()) {
    throw new Error("AI reasoning is missing or empty.");
  }

  const confidence = Number(data.confidence);
  if (isNaN(confidence) || confidence < 0 || confidence > 1) {
    throw new Error(`AI confidence score must be a number between 0 and 1. Received: ${data.confidence}`);
  }

  return {
    category: data.category,
    severity: data.severity,
    urgency: data.urgency,
    recommendedPriority: data.recommendedPriority,
    summary: data.summary.trim(),
    suggestedAction: data.suggestedAction.trim(),
    reasoning: data.reasoning.trim(),
    confidence: Math.round(confidence * 100) / 100,
    model: data.model || "ai-triage-engine",
    generatedAt: new Date()
  };
}

/**
 * Execute AI complaint triage on a complaint instance
 * @param {Object} complaint - Mongoose Complaint document
 * @returns {Promise<Object>} Validated triage subdocument
 */
export async function triageComplaint(complaint) {
  if (!complaint || !complaint.description) {
    throw new ApiError(400, "Complaint description is required for triage.");
  }

  const provider = getAIProvider();

  // Strip all sensitive or private user profile details before sending to AI
  const sanitizedInput = {
    description: complaint.description,
    reportedCategory: complaint.category,
    createdAt: complaint.createdAt,
    hasPhoto: Boolean(complaint.photoUrl)
  };

  try {
    const rawResult = await provider.analyzeComplaint(sanitizedInput);
    const validatedResult = validateTriageOutput(rawResult);
    return validatedResult;
  } catch (err) {
    const errorCategory = classifyProviderError(err);
    const safeMessage = errorCategory === "quota_exceeded"
      ? "Gemini API quota exceeded."
      : err?.message || "Unknown provider error";
    console.error("[NIVARA AI Triage Service Error]", {
      endpoint: "POST /api/admin/complaints/:id/ai-triage",
      provider: env.ai.provider,
      model: env.ai.model,
      category: errorCategory,
      errorType: err?.name || "Error",
      message: safeMessage
    });
    throw new ApiError(503, "AI analysis is temporarily unavailable. Please retry later.", { errorCategory });
  }
}
