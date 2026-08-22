import { ApiError } from "./apiError.js";

const allowedTransitions = {
  Open: ["In Progress", "Resolved"],
  "In Progress": ["Resolved"],
  Resolved: []
};

export function assertValidStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return;
  if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
    throw new ApiError(400, "Invalid status transition");
  }
}
