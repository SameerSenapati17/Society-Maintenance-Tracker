import mongoose from "mongoose";
import { calculateOverdueStatus } from "../utils/overdue.js";

export const STATUS_VALUES = ["Open", "In Progress", "Resolved"];
export const PRIORITY_VALUES = ["Low", "Medium", "High"];
export const CATEGORY_VALUES = ["Plumbing", "Electrical", "Cleaning", "Security", "Lift", "Parking", "Other"];
export const SEVERITY_VALUES = ["Low", "Medium", "High", "Critical"];
export const URGENCY_VALUES = ["Low", "Normal", "Urgent", "Emergency"];

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUS_VALUES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now, required: true }
  },
  { _id: true }
);

const aiTriageSchema = new mongoose.Schema(
  {
    category: { type: String, enum: CATEGORY_VALUES, required: true },
    severity: { type: String, enum: SEVERITY_VALUES, required: true },
    urgency: { type: String, enum: URGENCY_VALUES, required: true },
    recommendedPriority: { type: String, enum: PRIORITY_VALUES, required: true },
    summary: { type: String, trim: true, required: true },
    suggestedAction: { type: String, trim: true, required: true },
    reasoning: { type: String, trim: true, required: true },
    confidence: { type: Number, min: 0, max: 1, required: true },
    model: { type: String, required: true },
    generatedAt: { type: Date, default: Date.now, required: true }
  },
  { _id: false }
);

const aiEmbeddingSchema = new mongoose.Schema(
  {
    vector: { type: [Number], required: true },
    model: { type: String, required: true },
    generatedAt: { type: Date, default: Date.now, required: true }
  },
  { _id: false }
);

const visualPredictionSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    confidence: { type: Number, required: true }
  },
  { _id: false }
);

const visualAnalysisSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    confidence: { type: Number, required: true },
    topPredictions: { type: [visualPredictionSchema], default: [] },
    model: { type: String, required: true },
    generatedAt: { type: Date, default: Date.now, required: true },
    // Legacy Base64 fields (kept for backward compatibility)
    overlayBase64: { type: String },
    heatmapBase64: { type: String },
    // Phase 4B: URL-based references (preferred for large images)
    overlayUrl: { type: String, trim: true },
    heatmapUrl: { type: String, trim: true },
    // Phase 4B: Object-detection bounding boxes [ { label, confidence, bbox: [x,y,w,h] } ]
    detections: { type: mongoose.Schema.Types.Mixed, default: [] },
    summary: { type: String }
  },
  { _id: false }
);

const visualFeedbackSchema = new mongoose.Schema(
  {
    prediction: { type: String, trim: true },
    correctedCategory: { type: String, trim: true },
    accepted: { type: Boolean },
    reviewerRole: { type: String, enum: ["admin", "resident"] },
    modelVersion: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const multimodalAssessmentSchema = new mongoose.Schema(
  {
    state: { type: String, enum: ["AGREEMENT", "CONFLICT", "UNCERTAIN", "VISUAL_ONLY", "TEXT_ONLY"], required: true },
    textCategory: { type: String },
    visualCategory: { type: String },
    visualConfidence: { type: Number, min: 0, max: 1 },
    confidenceBand: { type: String, enum: ["HIGH", "MODERATE", "LOW"] },
    explanation: { type: String, required: true },
    reviewRecommended: { type: Boolean, required: true }
  },
  { _id: false }
);

const aiAnalysisStatusSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ["NEVER_ANALYZED", "ANALYZED", "FAILED"], required: true },
    lastAnalysisAttemptAt: { type: Date },
    lastSuccessfulAnalysisAt: { type: Date },
    lastAnalysisErrorCategory: { type: String }
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    residentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: String, enum: CATEGORY_VALUES, required: true, index: true },
    description: { type: String, required: true, trim: true },
    photoUrl: { type: String, trim: true },
    status: { type: String, enum: STATUS_VALUES, default: "Open", required: true, index: true },
    priority: { type: String, enum: PRIORITY_VALUES, default: "Medium", required: true, index: true },
    isOverdue: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    statusHistory: { type: [statusHistorySchema], default: [] },
    aiTriage: { type: aiTriageSchema },
    aiEmbedding: { type: aiEmbeddingSchema },
    visualAnalysis: { type: visualAnalysisSchema },
    multimodalAssessment: { type: multimodalAssessmentSchema },
    aiAnalysisStatus: { type: aiAnalysisStatusSchema },
    visualFeedback: { type: visualFeedbackSchema }
  },
  { timestamps: true }
);

complaintSchema.index({ createdAt: -1 });

complaintSchema.methods.refreshOverdue = function refreshOverdue() {
  this.isOverdue = calculateOverdueStatus(this);
  return this.isOverdue;
};

export const Complaint = mongoose.model("Complaint", complaintSchema);
