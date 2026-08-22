import { validationResult } from "express-validator";
import { ApiError } from "../utils/apiError.js";

export function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const message = result.array().map((error) => error.msg).join(", ");
  return next(new ApiError(400, message));
}
