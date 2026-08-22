import { env } from "../config/env.js";

export function calculateOverdueStatus(complaint, now = new Date()) {
  if (!complaint || complaint.status === "Resolved") return false;
  const createdAt = new Date(complaint.createdAt);
  const dueAt = new Date(createdAt.getTime() + env.overdueDays * 24 * 60 * 60 * 1000);
  return now > dueAt;
}
