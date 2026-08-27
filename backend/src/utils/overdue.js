import { env } from "../config/env.js";

export function getDueDate(complaint) {
  if (!complaint || !complaint.createdAt) return null;
  const createdAt = new Date(complaint.createdAt);
  return new Date(createdAt.getTime() + env.overdueDays * 24 * 60 * 60 * 1000);
}

export function calculateOverdueStatus(complaint, now = new Date()) {
  if (!complaint || complaint.status === "Resolved") return false;
  const dueAt = getDueDate(complaint);
  if (!dueAt) return false;
  return now > dueAt;
}

export function isApproachingSla(complaint, now = new Date()) {
  if (!complaint || complaint.status === "Resolved") return false;
  const dueAt = getDueDate(complaint);
  if (!dueAt) return false;
  if (now > dueAt) return false;
  const warningWindowMs = Math.min(24 * 60 * 60 * 1000, (env.overdueDays * 24 * 60 * 60 * 1000) * 0.35);
  const warningThreshold = new Date(dueAt.getTime() - warningWindowMs);
  return now >= warningThreshold;
}
