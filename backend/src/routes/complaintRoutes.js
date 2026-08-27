import express from "express";
import { body, param, query } from "express-validator";
import {
  createComplaint,
  findDuplicateComplaints,
  getAdminComplaintById,
  getAdminComplaints,
  getAdminDashboard,
  getComplaintById,
  getMyComplaints,
  getNotifications,
  triageComplaintAI,
  analyzeComplaintVisualAI,
  submitVisualFeedback,
  updatePriority,
  updateStatus
} from "../controllers/complaintController.js";

import { requireAuth, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { CATEGORY_VALUES, PRIORITY_VALUES, STATUS_VALUES } from "../models/Complaint.js";

export const complaintRoutes = express.Router();
export const adminComplaintRoutes = express.Router();

const idParam = param("id").isMongoId().withMessage("Valid complaint ID is required");

complaintRoutes.post(
  "/",
  requireAuth,
  requireRole("resident"),
  upload.single("photo"),
  [body("category").isIn(CATEGORY_VALUES).withMessage("Invalid category"), body("description").trim().isLength({ min: 10 }).withMessage("Description must be at least 10 characters")],
  validate,
  createComplaint
);
complaintRoutes.get("/my", requireAuth, requireRole("resident"), getMyComplaints);
complaintRoutes.get("/notifications", requireAuth, getNotifications);
complaintRoutes.get("/:id", requireAuth, idParam, validate, getComplaintById);
// Phase 4B: visual feedback — requireAuth only (admin + resident both can submit)
complaintRoutes.post("/:id/visual-feedback", requireAuth, idParam, validate, submitVisualFeedback);

adminComplaintRoutes.get(
  "/complaints",
  requireAuth,
  requireRole("admin"),
  [
    query("category").optional().isIn(CATEGORY_VALUES).withMessage("Invalid category"),
    query("status").optional().isIn(STATUS_VALUES).withMessage("Invalid status"),
    query("priority").optional().isIn(PRIORITY_VALUES).withMessage("Invalid priority")
  ],
  validate,
  getAdminComplaints
);
adminComplaintRoutes.get("/complaints/:id", requireAuth, requireRole("admin"), idParam, validate, getAdminComplaintById);
adminComplaintRoutes.patch(
  "/complaints/:id/status",
  requireAuth,
  requireRole("admin"),
  [idParam, body("status").isIn(STATUS_VALUES).withMessage("Invalid status"), body("note").optional().trim().isLength({ max: 500 }).withMessage("Note is too long")],
  validate,
  updateStatus
);
adminComplaintRoutes.patch(
  "/complaints/:id/priority",
  requireAuth,
  requireRole("admin"),
  [idParam, body("priority").isIn(PRIORITY_VALUES).withMessage("Invalid priority")],
  validate,
  updatePriority
);
adminComplaintRoutes.post(
  "/complaints/:id/ai-triage",
  requireAuth,
  requireRole("admin"),
  idParam,
  validate,
  triageComplaintAI
);
adminComplaintRoutes.post(
  "/complaints/:id/find-duplicates",
  requireAuth,
  requireRole("admin"),
  idParam,
  validate,
  findDuplicateComplaints
);
adminComplaintRoutes.post(
  "/complaints/:id/visual-analysis",
  requireAuth,
  requireRole("admin"),
  idParam,
  validate,
  analyzeComplaintVisualAI
);
// Phase 4B: visual feedback — requireAuth only (admin + resident both can submit)
adminComplaintRoutes.post(
  "/complaints/:id/visual-feedback",
  requireAuth,
  idParam,
  validate,
  submitVisualFeedback
);
adminComplaintRoutes.get("/dashboard", requireAuth, requireRole("admin"), getAdminDashboard);


