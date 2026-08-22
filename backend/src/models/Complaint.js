import mongoose from "mongoose";
import { calculateOverdueStatus } from "../utils/overdue.js";

export const STATUS_VALUES = ["Open", "In Progress", "Resolved"];
export const PRIORITY_VALUES = ["Low", "Medium", "High"];
export const CATEGORY_VALUES = ["Plumbing", "Electrical", "Cleaning", "Security", "Lift", "Parking", "Other"];

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUS_VALUES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now, required: true }
  },
  { _id: true }
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
    statusHistory: { type: [statusHistorySchema], default: [] }
  },
  { timestamps: true }
);

complaintSchema.index({ createdAt: -1 });

complaintSchema.methods.refreshOverdue = function refreshOverdue() {
  this.isOverdue = calculateOverdueStatus(this);
  return this.isOverdue;
};

export const Complaint = mongoose.model("Complaint", complaintSchema);
