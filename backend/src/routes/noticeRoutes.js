import express from "express";
import { body, param } from "express-validator";
import { createNotice, deleteNotice, getNotices, updateNotice } from "../controllers/noticeController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

export const noticeRoutes = express.Router();
export const adminNoticeRoutes = express.Router();

noticeRoutes.get("/", requireAuth, getNotices);

adminNoticeRoutes.post(
  "/notices",
  requireAuth,
  requireRole("admin"),
  [body("title").trim().isLength({ min: 3 }).withMessage("Title is required"), body("content").trim().isLength({ min: 5 }).withMessage("Content is required")],
  validate,
  createNotice
);

adminNoticeRoutes.patch(
  "/notices/:id",
  requireAuth,
  requireRole("admin"),
  [param("id").isMongoId().withMessage("Valid notice ID is required"), body("title").optional().trim().isLength({ min: 3 }).withMessage("Title is required"), body("content").optional().trim().isLength({ min: 5 }).withMessage("Content is required")],
  validate,
  updateNotice
);

adminNoticeRoutes.delete("/notices/:id", requireAuth, requireRole("admin"), param("id").isMongoId(), validate, deleteNotice);
