import multer from "multer";
import { ApiError } from "../utils/apiError.js";

const storage = multer.memoryStorage();
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new ApiError(400, "Photo must be a JPG, PNG, or WEBP image"));
    }
    return cb(null, true);
  }
});
