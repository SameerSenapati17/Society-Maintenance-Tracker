import mongoose from "mongoose";
import { Complaint } from "../models/Complaint.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";
import { uploadComplaintPhoto } from "../services/cloudinaryService.js";
import { assertValidStatusTransition } from "../utils/statusLifecycle.js";
import { sendStatusChangeEmail } from "../services/emailService.js";
import { isApproachingSla } from "../utils/overdue.js";
import { triageComplaint } from "../services/ai/triageService.js";
import { findSimilarComplaints } from "../services/ai/embeddingService.js";
import { analyzeComplaintImage } from "../services/ai/visualAnalysisService.js";
import { buildMultimodalAssessment } from "../services/ai/multimodalAssessmentService.js";


function priorityRank(priority) {
  return { High: 1, Medium: 2, Low: 3 }[priority] || 4;
}

function sortComplaints(a, b) {
  if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
  const priorityDiff = priorityRank(a.priority) - priorityRank(b.priority);
  if (priorityDiff) return priorityDiff;
  return new Date(b.createdAt) - new Date(a.createdAt);
}

async function findVisibleComplaint(req, id) {
  const complaint = await Complaint.findById(id)
    .populate("residentId", "name email")
    .populate("statusHistory.changedBy", "name email role");
  if (!complaint) throw new ApiError(404, "Complaint not found");
  if (req.user.role === "resident" && String(complaint.residentId._id) !== String(req.user._id)) {
    throw new ApiError(403, "Forbidden");
  }
  complaint.multimodalAssessment = buildMultimodalAssessment({
    triage: complaint.aiTriage,
    visualAnalysis: complaint.visualAnalysis
  });
  complaint.refreshOverdue();
  await complaint.save();
  return complaint;
}

export const createComplaint = asyncHandler(async (req, res) => {
  const photoUrl = await uploadComplaintPhoto(req.file);
  const now = new Date();
  const complaint = await Complaint.create({
    residentId: req.user._id,
    category: req.body.category,
    description: req.body.description,
    photoUrl,
    status: "Open",
    priority: "Medium",
    statusHistory: [{ status: "Open", changedBy: req.user._id, note: "Complaint submitted", timestamp: now }]
  });
  complaint.refreshOverdue();
  await complaint.save();
  sendResponse(res, 201, "Complaint submitted", { complaint });
});

export const getMyComplaints = asyncHandler(async (req, res) => {
  const complaints = await Complaint.find({ residentId: req.user._id }).sort({ createdAt: -1 });
  for (const complaint of complaints) {
    complaint.refreshOverdue();
    await complaint.save();
  }
  sendResponse(res, 200, "Resident complaints", { complaints });
});

export const getComplaintById = asyncHandler(async (req, res) => {
  const complaint = await findVisibleComplaint(req, req.params.id);
  sendResponse(res, 200, "Complaint details", { complaint });
});

export const getAdminComplaints = asyncHandler(async (req, res) => {
  const filter = {};
  for (const key of ["category", "status", "priority"]) {
    if (req.query[key]) filter[key] = req.query[key];
  }
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }
  if (req.query.overdue === "true") filter.isOverdue = true;

  let complaints = await Complaint.find(filter).populate("residentId", "name email");
  for (const complaint of complaints) {
    complaint.refreshOverdue();
    await complaint.save();
  }

  if (req.query.search) {
    const term = req.query.search.toLowerCase().trim();
    complaints = complaints.filter((c) => {
      const id = String(c._id).toLowerCase();
      const resident = c.residentId?.name?.toLowerCase() || "";
      const desc = c.description?.toLowerCase() || "";
      const cat = c.category?.toLowerCase() || "";
      return id.includes(term) || resident.includes(term) || desc.includes(term) || cat.includes(term);
    });
  }

  complaints.sort(sortComplaints);
  sendResponse(res, 200, "All complaints", { complaints });
});

export const getAdminComplaintById = asyncHandler(async (req, res) => {
  const complaint = await findVisibleComplaint(req, req.params.id);
  sendResponse(res, 200, "Complaint details", { complaint });
});

export const updatePriority = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, "Complaint not found");
  complaint.priority = req.body.priority;
  complaint.refreshOverdue();
  await complaint.save();
  sendResponse(res, 200, "Priority updated", { complaint });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, "Complaint not found");
  if (complaint.status === "Resolved") throw new ApiError(400, "Resolved complaints are closed");

  const previousStatus = complaint.status;
  assertValidStatusTransition(previousStatus, req.body.status);

  if (previousStatus !== req.body.status) {
    const timestamp = new Date();
    complaint.status = req.body.status;
    complaint.statusHistory.push({
      status: req.body.status,
      changedBy: req.user._id,
      note: req.body.note,
      timestamp
    });
    if (req.body.status === "Resolved") complaint.resolvedAt = timestamp;
    complaint.refreshOverdue();
    await complaint.save();

    const resident = await User.findById(complaint.residentId);
    if (resident) {
      await sendStatusChangeEmail({
        to: resident.email,
        complaintId: complaint._id,
        category: complaint.category,
        previousStatus,
        newStatus: complaint.status,
        note: req.body.note,
        timestamp
      });
    }
  }

  sendResponse(res, 200, "Status updated", { complaint });
});

function buildTrendData(complaints, days) {
  const result = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const count = complaints.filter((c) => {
      const created = new Date(c.createdAt);
      return created >= day && created < next;
    }).length;
    result.push({
      date: day.toISOString().slice(0, 10),
      label: day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      count
    });
  }
  return result;
}

function computeResolutionMetrics(complaints) {
  const resolved = complaints.filter((c) => c.status === "Resolved" && c.resolvedAt);
  const totalCount = complaints.length;
  if (!resolved.length) {
    return { resolutionRate: 0, avgResolutionDays: null, resolvedCount: 0, categoryResolution: [] };
  }

  const totalMs = resolved.reduce((sum, c) => sum + (new Date(c.resolvedAt) - new Date(c.createdAt)), 0);
  const avgResolutionDays = Math.round((totalMs / resolved.length / 86400000) * 10) / 10;
  const resolutionRate = totalCount ? Math.round((resolved.length / totalCount) * 100) : 0;

  const catMap = {};
  for (const c of resolved) {
    if (!catMap[c.category]) catMap[c.category] = { totalMs: 0, count: 0 };
    catMap[c.category].totalMs += new Date(c.resolvedAt) - new Date(c.createdAt);
    catMap[c.category].count += 1;
  }

  const categoryResolution = Object.entries(catMap).map(([category, val]) => ({
    category,
    count: val.count,
    avgDays: Math.round((val.totalMs / val.count / 86400000) * 10) / 10
  }));

  return { resolutionRate, avgResolutionDays, resolvedCount: resolved.length, categoryResolution };
}

function buildRecurringIssues(complaints, days = 30) {
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - days);
  const prevStart = new Date(periodStart);
  prevStart.setDate(prevStart.getDate() - days);

  const current = complaints.filter((c) => new Date(c.createdAt) >= periodStart);
  const previous = complaints.filter((c) => {
    const d = new Date(c.createdAt);
    return d >= prevStart && d < periodStart;
  });

  const currentMap = {};
  for (const c of current) currentMap[c.category] = (currentMap[c.category] || 0) + 1;

  const prevMap = {};
  for (const c of previous) prevMap[c.category] = (prevMap[c.category] || 0) + 1;

  return Object.entries(currentMap)
    .map(([name, count]) => {
      const prevCount = prevMap[name] || 0;
      let changePercent = null;
      if (prevCount > 0) changePercent = Math.round(((count - prevCount) / prevCount) * 100);
      else if (count > 0) changePercent = 100;
      return { name, count, changePercent };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function buildNeedsAttention(complaints) {
  const overdue = complaints.filter((c) => c.isOverdue);
  const highPriority = complaints.filter((c) => c.priority === "High" && c.status !== "Resolved");
  const approaching = complaints.filter((c) => !c.isOverdue && isApproachingSla(c));
  const unresolved = complaints.filter((c) => c.status !== "Resolved");

  return {
    overdueCount: overdue.length,
    highPriorityCount: highPriority.length,
    approachingSlaCount: approaching.length,
    unresolvedCount: unresolved.length,
    items: [
      ...overdue.slice(0, 5).map((c) => ({
        type: "overdue",
        complaintId: c._id,
        category: c.category,
        description: c.description.slice(0, 80),
        priority: c.priority,
        status: c.status
      })),
      ...highPriority.filter((c) => !c.isOverdue).slice(0, 3).map((c) => ({
        type: "high_priority",
        complaintId: c._id,
        category: c.category,
        description: c.description.slice(0, 80),
        priority: c.priority,
        status: c.status
      })),
      ...approaching.filter((c) => c.priority !== "High").slice(0, 3).map((c) => ({
        type: "approaching_sla",
        complaintId: c._id,
        category: c.category,
        description: c.description.slice(0, 80),
        priority: c.priority,
        status: c.status
      }))
    ].slice(0, 8)
  };
}

function computeHealthScore(total, resolved, overdue, highPriorityUnresolved) {
  if (!total) return { score: 100, resolutionRate: 0, overdueRate: 0, highPriorityCount: 0 };
  const resolutionRate = Math.round((resolved / total) * 100);
  const overdueRate = Math.round((overdue / total) * 100);
  const penalty = overdueRate * 0.5 + (highPriorityUnresolved / total) * 100 * 0.3;
  const score = Math.max(0, Math.min(100, Math.round(resolutionRate - penalty)));
  return { score, resolutionRate, overdueRate, highPriorityCount: highPriorityUnresolved };
}

export const getAdminDashboard = asyncHandler(async (req, res) => {
  const trendDays = Math.min(Math.max(Number(req.query.trendDays) || 7, 7), 90);
  const complaints = await Complaint.find().populate("residentId", "name email");
  let overdue = 0;
  let highPriorityUnresolved = 0;
  let approachingSla = 0;

  for (const complaint of complaints) {
    complaint.refreshOverdue();
    if (complaint.isOverdue) overdue += 1;
    else if (isApproachingSla(complaint)) approachingSla += 1;
    if (complaint.priority === "High" && complaint.status !== "Resolved") highPriorityUnresolved += 1;
    await complaint.save();
  }

  const [byStatus, byCategory] = await Promise.all([
    Complaint.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Complaint.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }])
  ]);

  const statusMap = Object.fromEntries(byStatus.map((item) => [item._id, item.count]));
  const resolved = statusMap.Resolved || 0;
  const metrics = computeResolutionMetrics(complaints);
  const health = computeHealthScore(complaints.length, resolved, overdue, highPriorityUnresolved);
  const withinSla = Math.max(0, complaints.length - overdue - approachingSla);

  const recentComplaints = [...complaints]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map((c) => ({
      _id: c._id,
      category: c.category,
      description: c.description.slice(0, 60),
      status: c.status,
      priority: c.priority,
      isOverdue: c.isOverdue,
      createdAt: c.createdAt,
      residentName: c.residentId?.name
    }));

  sendResponse(res, 200, "Dashboard analytics", {
    total: complaints.length,
    open: statusMap.Open || 0,
    inProgress: statusMap["In Progress"] || 0,
    resolved,
    overdue,
    slaPerformance: {
      withinSla,
      approachingSla,
      overdue
    },
    needsAttention: complaints.length ? buildNeedsAttention(complaints) : { overdueCount: 0, highPriorityCount: 0, approachingSlaCount: 0, unresolvedCount: 0, items: [] },
    resolutionRate: metrics.resolutionRate,
    avgResolutionDays: metrics.avgResolutionDays,
    categoryResolution: metrics.categoryResolution,
    health,
    trends: buildTrendData(complaints, trendDays),
    trendDays,
    recurringIssues: buildRecurringIssues(complaints, 30),
    recentComplaints,
    byStatus: byStatus.map((item) => ({ name: item._id, count: item.count })),
    byCategory: byCategory.map((item) => ({ name: item._id, count: item.count }))
  });
});

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = [];

  if (req.user.role === "admin") {
    const recent = await Complaint.find({ "statusHistory.1": { $exists: true } })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate("statusHistory.changedBy", "name role");

    for (const complaint of recent) {
      const last = complaint.statusHistory[complaint.statusHistory.length - 1];
      if (last && last.changedBy?.role === "admin") {
        notifications.push({
          id: `${complaint._id}-${last._id}`,
          type: "status_change",
          message: `Complaint #${String(complaint._id).slice(-6)} is now ${last.status}`,
          complaintId: complaint._id,
          timestamp: last.timestamp
        });
      }
    }
  } else {
    const myComplaints = await Complaint.find({ residentId: req.user._id }).sort({ updatedAt: -1 }).limit(10);
    for (const complaint of myComplaints) {
      if (complaint.statusHistory.length > 1) {
        const last = complaint.statusHistory[complaint.statusHistory.length - 1];
        notifications.push({
          id: `${complaint._id}-${last._id}`,
          type: "status_change",
          message: `Your complaint is now ${last.status}`,
          complaintId: complaint._id,
          timestamp: last.timestamp
        });
      }
    }
  }

  const { Notice } = await import("../models/Notice.js");
  const importantNotices = await Notice.find({ isImportant: true }).sort({ createdAt: -1 }).limit(3);
  for (const notice of importantNotices) {
    notifications.push({
      id: `notice-${notice._id}`,
      type: "important_notice",
      message: `Important notice: ${notice.title}`,
      noticeId: notice._id,
      timestamp: notice.createdAt
    });
  }

  notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  sendResponse(res, 200, "Notifications", { notifications: notifications.slice(0, 15) });
});

export const triageComplaintAI = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, "Complaint not found");

  const attemptAt = new Date();
  complaint.aiAnalysisStatus = {
    status: "ANALYZED",
    lastAnalysisAttemptAt: attemptAt,
    lastSuccessfulAnalysisAt: complaint.aiAnalysisStatus?.lastSuccessfulAnalysisAt || complaint.aiTriage?.generatedAt,
    lastAnalysisErrorCategory: undefined
  };

  let triageResult;
  try {
    triageResult = await triageComplaint(complaint);
  } catch (error) {
    complaint.aiAnalysisStatus = {
      status: "FAILED",
      lastAnalysisAttemptAt: attemptAt,
      lastSuccessfulAnalysisAt: complaint.aiAnalysisStatus?.lastSuccessfulAnalysisAt || complaint.aiTriage?.generatedAt,
      lastAnalysisErrorCategory: error.errorCategory || "provider_unavailable"
    };
    await complaint.save();
    throw error;
  }

  // Store AI operational intelligence separately (Human-in-the-loop design)
  complaint.aiTriage = triageResult;
  complaint.aiAnalysisStatus = {
    status: "ANALYZED",
    lastAnalysisAttemptAt: attemptAt,
    lastSuccessfulAnalysisAt: triageResult.generatedAt,
    lastAnalysisErrorCategory: undefined
  };
  complaint.multimodalAssessment = buildMultimodalAssessment({
    triage: complaint.aiTriage,
    visualAnalysis: complaint.visualAnalysis
  });
  await complaint.save();

  sendResponse(res, 200, "AI triage completed", {
    triage: complaint.aiTriage,
    multimodalAssessment: complaint.multimodalAssessment,
    aiAnalysisStatus: complaint.aiAnalysisStatus
  });
});

export const findDuplicateComplaints = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, "Complaint not found");

  const results = await findSimilarComplaints(complaint);

  // Return only safe, non-sensitive preview fields for each match
  const matches = results.map(({ complaint: c, similarity }) => ({
    complaintId: c._id,
    similarity: Math.round(similarity * 10000) / 10000,
    percentage: Math.round(similarity * 100),
    description: c.description,
    category: c.category,
    status: c.status,
    priority: c.priority,
    residentName: c.residentId?.name || "Resident",
    createdAt: c.createdAt
  }));

  sendResponse(res, 200, "Duplicate incident analysis complete", {
    complaintId: complaint._id,
    matches
  });
});

export const analyzeComplaintVisualAI = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, "Complaint not found");

  if (!complaint.photoUrl) {
    throw new ApiError(400, "Complaint does not have an attached photo for visual analysis.");
  }

  const visualAnalysis = await analyzeComplaintImage(complaint.photoUrl, { complaintId: complaint._id });

  // Store visual operational intelligence separately (Human-in-the-loop design)
  complaint.visualAnalysis = visualAnalysis;
  complaint.multimodalAssessment = buildMultimodalAssessment({
    triage: complaint.aiTriage,
    visualAnalysis: complaint.visualAnalysis
  });
  await complaint.save();

  sendResponse(res, 200, "Visual analysis complete", {
    visualAnalysis: complaint.visualAnalysis,
    multimodalAssessment: complaint.multimodalAssessment
  });
});

// ── Phase 4B: Visual Feedback ─────────────────────────────────────────────────
// Both admin and resident may call this. AI never auto-modifies complaint fields.
export const submitVisualFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { accepted, correctedCategory } = req.body;
    const role = req.user?.role;

    if (typeof accepted !== "boolean") {
      return res.status(400).json({ message: "accepted (boolean) is required." });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found." });

    if (!complaint.visualAnalysis?.category) {
      return res.status(400).json({ message: "No visual analysis exists on this complaint." });
    }

    const VALID_CATEGORIES = [
      "broken_infrastructure",
      "electrical_hazard",
      "garbage_waste",
      "parking_road_damage",
      "wall_ceiling_damage",
      "Water Leakage",
      "Wall/Ceiling Damage",
      "Garbage/Waste",
      "Electrical Hazard",
      "Broken Infrastructure",
      "Lift/Door Damage",
      "Parking/Road Damage",
      "Other"
    ];

    if (!accepted && correctedCategory && !VALID_CATEGORIES.includes(correctedCategory)) {
      return res.status(400).json({
        message: `Invalid correctedCategory. Must be one of: ${VALID_CATEGORIES.join(", ")}`
      });
    }

    complaint.visualFeedback = {
      prediction: complaint.visualAnalysis.category,
      correctedCategory: accepted
        ? complaint.visualAnalysis.category
        : correctedCategory || null,
      accepted,
      reviewerRole: role,
      modelVersion: complaint.visualAnalysis.model || "unknown",
      createdAt: new Date()
    };

    await complaint.save();

    res.status(200).json({
      message: "Visual feedback recorded.",
      data: { visualFeedback: complaint.visualFeedback }
    });
  } catch (err) {
    next(err);
  }
};
