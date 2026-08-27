import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";

function assertCloudinaryConfigured() {
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(500, "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
}

export async function uploadComplaintPhoto(file) {
  if (!file) return null;
  assertCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "society-maintenance/complaints", resource_type: "image" },
      (error, result) => {
        if (error) {
          console.error(`[Cloudinary] Upload failed: ${error.message || "Upload stream error"}`);
          return reject(new ApiError(502, "Image upload failed. Please verify the image file or submit without photo."));
        }
        return resolve(result.secure_url);
      }
    );
    stream.end(file.buffer);
  });
}

export async function uploadVisualArtifact(dataUri, artifactName) {
  if (!dataUri || typeof dataUri !== "string") return null;
  assertCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "society-maintenance/visual-analysis", public_id: artifactName, resource_type: "image" },
      (error, result) => {
        if (error) {
          console.error(`[Cloudinary] Visual artifact upload failed: ${error.message || "Upload stream error"}`);
          return reject(new ApiError(502, "Visual analysis artifacts could not be stored."));
        }
        return resolve(result.secure_url);
      }
    );
    const encoded = dataUri.includes(",") ? dataUri.split(",", 2)[1] : dataUri;
    stream.end(Buffer.from(encoded, "base64"));
  });
}
