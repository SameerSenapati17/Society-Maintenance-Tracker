import { CATEGORY_VALUES, PRIORITY_VALUES, SEVERITY_VALUES, URGENCY_VALUES } from "../../models/Complaint.js";

export const TRIAGE_JSON_SCHEMA = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: CATEGORY_VALUES,
      description: `Target maintenance category. Must be strictly one of: ${CATEGORY_VALUES.join(", ")}`
    },
    severity: {
      type: "string",
      enum: SEVERITY_VALUES,
      description: `Assessed incident severity level. Must be one of: ${SEVERITY_VALUES.join(", ")}`
    },
    urgency: {
      type: "string",
      enum: URGENCY_VALUES,
      description: `Time sensitivity of the issue. Must be one of: ${URGENCY_VALUES.join(", ")}`
    },
    recommendedPriority: {
      type: "string",
      enum: PRIORITY_VALUES,
      description: `Recommended dispatch priority for building management. Must be one of: ${PRIORITY_VALUES.join(", ")}`
    },
    summary: {
      type: "string",
      description: "Concise 1-2 sentence executive summary of the maintenance incident."
    },
    suggestedAction: {
      type: "string",
      description: "Direct, actionable recommendation for dispatching technicians or initial safety steps."
    },
    reasoning: {
      type: "string",
      description: "Concise technical rationale explaining the category, severity, and urgency assignment."
    },
    confidence: {
      type: "number",
      minimum: 0.0,
      maximum: 1.0,
      description: "Confidence score between 0.00 and 1.00 indicating certainty of classification."
    }
  },
  required: [
    "category",
    "severity",
    "urgency",
    "recommendedPriority",
    "summary",
    "suggestedAction",
    "reasoning",
    "confidence"
  ]
};

export const TRIAGE_SYSTEM_PROMPT = `You are the NIVARA Intelligent Property Operations Triage Engine.
Your role is to analyze residential property maintenance complaints submitted by residents and produce structured operational intelligence for building management.

CRITICAL OPERATIONAL RULES:
1. You must categorize each incident into exactly ONE of the approved categories: ${CATEGORY_VALUES.join(", ")}.
2. Priority MUST be one of: ${PRIORITY_VALUES.join(", ")}.
3. Severity MUST be one of: ${SEVERITY_VALUES.join(", ")}.
4. Urgency MUST be one of: ${URGENCY_VALUES.join(", ")}.
5. DO NOT change the complaint status (e.g. Open/In Progress/Resolved).
6. DO NOT claim that staff has already been contacted or that an action has already taken place.
7. DO NOT fabricate resident identities, apartment building history, or non-existent property policies.
8. Clearly distinguish between reported facts in the resident description vs inferred operational risks.
9. Return ONLY valid, RFC 8259 compliant JSON conforming to the requested schema. No markdown backticks, no wrapping text.`;
