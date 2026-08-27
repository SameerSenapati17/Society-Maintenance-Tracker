import { env } from "../../config/env.js";

export const VISUAL_CONFIDENCE_BANDS = {
  HIGH: 0.8,
  MODERATE: 0.6
};

export const TEXT_VISUAL_COMPATIBILITY = {
  Cleaning: ["garbage_waste"],
  Electrical: ["electrical_hazard"],
  Plumbing: ["water_leakage"],
  "Water Leakage": ["water_leakage"]
};

const VISUAL_CATEGORY_ALIASES = {
  "Wall/Ceiling Damage": "wall_ceiling_damage",
  "Garbage/Waste": "garbage_waste",
  "Electrical Hazard": "electrical_hazard",
  "Broken Infrastructure": "broken_infrastructure",
  "Parking/Road Damage": "parking_road_damage",
  "Water Leakage": "water_leakage"
};

function confidenceBand(confidence) {
  if (confidence >= VISUAL_CONFIDENCE_BANDS.HIGH) return "HIGH";
  if (confidence >= VISUAL_CONFIDENCE_BANDS.MODERATE) return "MODERATE";
  return "LOW";
}

function visualIsUncertain(visualAnalysis) {
  const threshold = env.visualAi.confidenceThreshold;
  const gapThreshold = env.visualAi.ambiguityGap;
  const confidence = Number(visualAnalysis.confidence);
  if (confidence < threshold) return true;

  const predictions = Array.isArray(visualAnalysis.topPredictions)
    ? visualAnalysis.topPredictions
    : [];
  if (predictions.length < 2) return false;
  return Number(predictions[0].confidence) - Number(predictions[1].confidence) < gapThreshold;
}

function buildExplanation(state, textCategory, visualCategory, confidence) {
  if (state === "AGREEMENT") {
    return `Text and photo evidence are consistent with a ${textCategory.toLowerCase()} incident.`;
  }
  if (state === "CONFLICT") {
    return `The text report and photo evidence indicate different incident types. The report describes ${textCategory.toLowerCase()} activity, while the visual model identifies ${visualCategory}. Admin review is recommended.`;
  }
  if (state === "UNCERTAIN") {
    return `The photo model is not sufficiently decisive about ${visualCategory}. Admin review is recommended before applying an operational recommendation.`;
  }
  if (state === "VISUAL_ONLY") {
    return `Text AI analysis is currently unavailable. The photo model identified ${visualCategory} with ${Math.round(confidence * 100)}% confidence.`;
  }
  return `Photo analysis is currently unavailable. The text analysis classified this incident as ${textCategory}.`;
}

export function buildMultimodalAssessment({ triage = null, visualAnalysis = null } = {}) {
  if (!triage && !visualAnalysis) return null;

  const textCategory = triage?.category || null;
  const visualCategory = VISUAL_CATEGORY_ALIASES[visualAnalysis?.category] || visualAnalysis?.category || null;
  const visualConfidence = typeof visualAnalysis?.confidence === "number" ? visualAnalysis.confidence : null;
  const band = visualConfidence === null ? null : confidenceBand(visualConfidence);

  if (!triage) {
    return {
      state: "VISUAL_ONLY",
      textCategory,
      visualCategory,
      visualConfidence,
      confidenceBand: band,
      explanation: buildExplanation("VISUAL_ONLY", "unavailable", visualCategory, visualConfidence || 0),
      reviewRecommended: true
    };
  }

  if (!visualAnalysis) {
    return {
      state: "TEXT_ONLY",
      textCategory,
      visualCategory,
      visualConfidence,
      confidenceBand: band,
      explanation: buildExplanation("TEXT_ONLY", textCategory, "unavailable", 0),
      reviewRecommended: false
    };
  }

  if (visualIsUncertain(visualAnalysis)) {
    return {
      state: "UNCERTAIN",
      textCategory,
      visualCategory,
      visualConfidence,
      confidenceBand: band,
      explanation: buildExplanation("UNCERTAIN", textCategory, visualCategory, visualConfidence),
      reviewRecommended: true
    };
  }

  const compatibleVisualCategories = TEXT_VISUAL_COMPATIBILITY[textCategory] || [];
  const state = compatibleVisualCategories.includes(visualCategory) ? "AGREEMENT" : "CONFLICT";
  return {
    state,
    textCategory,
    visualCategory,
    visualConfidence,
    confidenceBand: band,
    explanation: buildExplanation(state, textCategory, visualCategory, visualConfidence),
    reviewRecommended: state === "CONFLICT"
  };
}
