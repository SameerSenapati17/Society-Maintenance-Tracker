import { env } from "../../config/env.js";
import { Complaint } from "../../models/Complaint.js";
import { ApiError } from "../../utils/apiError.js";
import { getAIProvider } from "./triageService.js";

/**
 * Compute cosine similarity between two numeric vectors.
 * Returns a value in [-1, 1]. Returns 0 for zero-magnitude vectors.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/**
 * Normalizes complaint data into an embedding prompt representation.
 * Minimizes data to operational fields only (no auth, passwords, emails, or internal IDs).
 * @param {Object} complaint
 * @returns {string}
 */
export function normalizeComplaintText(complaint) {
  const category = complaint.category || "General";
  const description = (complaint.description || "").trim();
  return `Category: ${category}\nDescription: ${description}`;
}

/**
 * Lazily generates and persists an embedding for a complaint.
 * If the complaint already has an embedding from the current active model, returns it.
 * Stale embeddings from incompatible models are automatically regenerated.
 *
 * @param {import("mongoose").Document} complaint - Mongoose Complaint document
 * @returns {Promise<number[]>} Embedding vector (768-dimensional)
 */
export async function generateAndStoreEmbedding(complaint) {
  const provider = getAIProvider();
  const currentModel = provider.embeddingModel || env.ai.embeddingModel || "gemini-embedding-2";

  // Re-use cached embedding only if it matches the current active model and is non-empty
  if (
    complaint.aiEmbedding?.vector?.length > 0 &&
    complaint.aiEmbedding?.model === currentModel
  ) {
    return complaint.aiEmbedding.vector;
  }

  if (!complaint.description?.trim()) {
    throw new ApiError(400, "Complaint description is required for embedding.");
  }

  const normalizedText = normalizeComplaintText(complaint);

  try {
    const vector = await provider.generateEmbedding(normalizedText);
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error("Provider returned an empty or invalid embedding vector.");
    }

    // Persist embedding with active model tag
    complaint.aiEmbedding = {
      vector,
      model: currentModel,
      generatedAt: new Date()
    };
    await complaint.save();

    return vector;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Log safe diagnostic metadata without exposing sensitive credentials or keys
    console.error("[NIVARA Embedding Service Error]:", {
      provider: env.ai.provider,
      model: currentModel,
      complaintId: String(complaint._id),
      message: err.message
    });
    throw new ApiError(503, "Embedding generation is temporarily unavailable. Please retry later.");
  }
}

/**
 * Find complaints semantically similar to the given complaint using cosine similarity.
 * Self-excludes the source complaint. Compares only against embeddings generated with the same model.
 *
 * @param {import("mongoose").Document} complaint - Source complaint document
 * @param {{ threshold?: number, limit?: number }} options
 * @returns {Promise<Array<{ complaint: Object, similarity: number }>>}
 */
export async function findSimilarComplaints(complaint, options = {}) {
  const threshold = options.threshold ?? env.ai.duplicateThreshold;
  const limit = options.limit ?? env.ai.duplicateLimit;

  const provider = getAIProvider();
  const currentModel = provider.embeddingModel || env.ai.embeddingModel || "gemini-embedding-2";

  // Generate (or retrieve cached) embedding for source complaint
  const sourceVector = await generateAndStoreEmbedding(complaint);

  // Fetch all other candidate complaints with valid embeddings matching the current model
  const candidates = await Complaint.find({
    _id: { $ne: complaint._id },
    "aiEmbedding.model": currentModel,
    "aiEmbedding.vector": { $exists: true, $not: { $size: 0 } }
  })
    .select("_id description category status priority createdAt aiEmbedding residentId")
    .populate("residentId", "name")
    .lean();

  // Score candidate complaints
  const scored = candidates
    .map((c) => {
      const similarity = cosineSimilarity(sourceVector, c.aiEmbedding.vector);
      return { complaint: c, similarity };
    })
    .filter((item) => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return scored;
}
