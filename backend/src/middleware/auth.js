import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new ApiError(401, "Authentication required");
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.id).select("-passwordHash");
    if (!user) throw new ApiError(401, "Invalid authentication token");
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "Invalid authentication token");
  }
});

export const requireRole = (role) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, "Authentication required"));
  if (req.user.role !== role) return next(new ApiError(403, "Forbidden"));
  return next();
};
