import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../src/app.js";
import { User } from "../src/models/User.js";
import { Complaint } from "../src/models/Complaint.js";
import { setAIProvider } from "../src/services/ai/triageService.js";
import { MockAIProvider } from "../src/services/ai/mockProvider.js";
import { GeminiProvider, isQuotaExceeded } from "../src/services/ai/geminiProvider.js";
import {
  cosineSimilarity,
  generateAndStoreEmbedding,
  normalizeComplaintText
} from "../src/services/ai/embeddingService.js";
import {
  setMockVisualResponse,
  setMockVisualShouldFail
} from "../src/services/ai/visualAnalysisService.js";
import { buildMultimodalAssessment } from "../src/services/ai/multimodalAssessmentService.js";
import { env } from "../src/config/env.js";

let mongo;
let adminToken;
let residentToken;
let residentId;
let mockProvider;

const triageCleaning = { category: "Cleaning" };
const visualWaste = { category: "garbage_waste", confidence: 0.92, topPredictions: [{ category: "garbage_waste", confidence: 0.92 }, { category: "wall_ceiling_damage", confidence: 0.04 }] };

async function login(email) {
  const res = await request(app).post("/api/auth/login").send({ email, password: "Password123" });
  assert.equal(res.status, 200);
  return res.body.data.token;
}

// ──────────────────────────────────────────────────────────
// Setup / Teardown
// ──────────────────────────────────────────────────────────

test.before(async () => {
  process.env.JWT_SECRET = "test-secret";
  process.env.OVERDUE_DAYS = "3";
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const passwordHash = await bcrypt.hash("Password123", 10);
  const [admin, resident] = await User.create([
    { name: "Admin AI", email: "admin-ai@test.com", passwordHash, role: "admin" },
    { name: "Resident AI", email: "resident-ai@test.com", passwordHash, role: "resident" }
  ]);
  residentId = resident._id;
  adminToken = await login(admin.email);
  residentToken = await login(resident.email);

  mockProvider = new MockAIProvider();
  setAIProvider(mockProvider);
});

test.after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

// ──────────────────────────────────────────────────────────
// AI Triage Tests (Phase 3A — preserved)
// ──────────────────────────────────────────────────────────

test("1. Unauthenticated AI triage request returns 401", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Water leaking heavily through kitchen ceiling.",
    status: "Open",
    priority: "Medium"
  });

  const res = await request(app).post(`/api/admin/complaints/${complaint._id}/ai-triage`);
  assert.equal(res.status, 401);
});

test("2. Resident AI triage request returns 403 Forbidden", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Water leaking heavily through kitchen ceiling.",
    status: "Open",
    priority: "Medium"
  });

  const res = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/ai-triage`)
    .set("Authorization", `Bearer ${residentToken}`);
  assert.equal(res.status, 403);
});

test("3. Admin AI triage request returns 200 with structured intelligence", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Main pipe burst in bathroom causing flooding.",
    status: "Open",
    priority: "Medium"
  });

  const res = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/ai-triage`)
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(res.status, 200);
  assert.ok(res.body.data.triage);

  const triage = res.body.data.triage;
  assert.equal(triage.category, "Plumbing");
  assert.equal(triage.recommendedPriority, "High");
  assert.ok(["High", "Critical"].includes(triage.severity));
  assert.ok(["Urgent", "Emergency"].includes(triage.urgency));
  assert.ok(triage.summary.length > 5);
  assert.ok(triage.suggestedAction.length > 5);
  assert.ok(triage.reasoning.length > 5);
  assert.ok(triage.confidence >= 0 && triage.confidence <= 1);
  assert.ok(triage.model);
  assert.ok(triage.generatedAt);

  // Verify complaint core fields were NOT automatically overwritten
  const updatedComplaint = await Complaint.findById(complaint._id);
  assert.equal(updatedComplaint.status, "Open");     // Preserved
  assert.equal(updatedComplaint.priority, "Medium"); // Preserved
  assert.equal(updatedComplaint.category, "Plumbing"); // Preserved
  assert.ok(updatedComplaint.aiTriage);
  assert.equal(updatedComplaint.aiTriage.recommendedPriority, "High");
});

test("4. Invalid complaint ID returns 404", async () => {
  const nonExistentId = new mongoose.Types.ObjectId();
  const res = await request(app)
    .post(`/api/admin/complaints/${nonExistentId}/ai-triage`)
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(res.status, 404);
});

test("5. AI provider upstream failure returns controlled 503 error", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Electrical",
    description: "Flickering lights in hallway.",
    status: "Open",
    priority: "Medium"
  });

  mockProvider.setShouldFail(true);

  const res = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/ai-triage`)
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(res.status, 503);
  assert.ok(res.body.message.includes("AI analysis is temporarily unavailable"));

  // Reset provider
  mockProvider.setShouldFail(false);
});

test("5a. Successful AI triage rerun replaces the prior analysis without mutating workflow fields", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Cleaning",
    description: "Overflowing garbage bins beside the parking entrance.",
    status: "Open",
    priority: "Low",
    statusHistory: []
  });

  const first = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/ai-triage`)
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(first.status, 200);

  mockProvider.setMockResponse({
    category: "Cleaning",
    severity: "Medium",
    urgency: "Normal",
    recommendedPriority: "Medium",
    summary: "Updated triage result.",
    suggestedAction: "Schedule cleaning inspection.",
    reasoning: "The updated report indicates a broader common-area hygiene issue.",
    confidence: 0.95
  });

  const second = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/ai-triage`)
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(second.status, 200);
  assert.equal(second.body.data.triage.summary, "Updated triage result.");

  const updated = await Complaint.findById(complaint._id);
  assert.equal(updated.category, "Cleaning");
  assert.equal(updated.priority, "Low");
  assert.equal(updated.status, "Open");
  assert.equal(updated.statusHistory.length, 0);
  assert.equal(updated.aiTriage.summary, "Updated triage result.");
  mockProvider.setMockResponse(null);
});

test("5b. Failed AI rerun returns 503 and preserves the last successful analysis", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Cleaning",
    description: "Waste has accumulated in the lobby corridor.",
    status: "Open",
    priority: "Medium",
    statusHistory: [],
    aiTriage: {
      category: "Cleaning",
      severity: "Medium",
      urgency: "Normal",
      recommendedPriority: "Medium",
      summary: "Previous successful analysis.",
      suggestedAction: "Assign routine cleaning service.",
      reasoning: "The report describes a sanitation issue.",
      confidence: 0.95,
      model: "gemini/gemini-3.7-flash",
      generatedAt: new Date()
    }
  });
  const before = await Complaint.findById(complaint._id).lean();
  mockProvider.setShouldFail(true);

  const response = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/ai-triage`)
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(response.status, 503);
  assert.equal(response.body.message, "AI analysis is temporarily unavailable. Please retry later.");
  const after = await Complaint.findById(complaint._id).lean();
  assert.equal(after.aiTriage.summary, before.aiTriage.summary);
  assert.equal(after.aiTriage.confidence, before.aiTriage.confidence);
  assert.equal(after.category, before.category);
  assert.equal(after.priority, before.priority);
  assert.equal(after.status, before.status);
  assert.deepEqual(after.statusHistory, before.statusHistory);
  mockProvider.setShouldFail(false);
});

test("5b-1. Quota failure returns quota_exceeded and preserves the previous analysis", async () => {
  const previousMessage = "Previous successful quota test analysis.";
  const complaint = await Complaint.create({
    residentId,
    category: "Cleaning",
    description: "Waste has accumulated in the lobby.",
    status: "Open",
    priority: "Medium",
    statusHistory: [],
    aiTriage: {
      category: "Cleaning",
      severity: "Medium",
      urgency: "Normal",
      recommendedPriority: "Medium",
      summary: previousMessage,
      suggestedAction: "Schedule cleaning.",
      reasoning: "Waste was reported.",
      confidence: 0.95,
      model: "gemini/gemini-3.7-flash",
      generatedAt: new Date()
    }
  });
  setAIProvider({
    async analyzeComplaint() {
      throw Object.assign(new Error("You exceeded your current quota for generate_content_free_tier_requests"), { status: 429 });
    }
  });

  const response = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/ai-triage`)
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(response.status, 503);
  assert.equal(response.body.error.category, "quota_exceeded");
  assert.equal(response.body.error.message, "The AI service has reached its current usage limit. Please try again later.");
  const serialized = JSON.stringify(response.body);
  assert.doesNotMatch(serialized, /free_tier_requests|current quota|quota numbers/i);

  const updated = await Complaint.findById(complaint._id);
  assert.equal(updated.aiTriage.summary, previousMessage);
  assert.equal(updated.aiAnalysisStatus.status, "FAILED");
  assert.equal(updated.aiAnalysisStatus.lastAnalysisErrorCategory, "quota_exceeded");
  assert.equal(updated.category, "Cleaning");
  assert.equal(updated.priority, "Medium");
  assert.equal(updated.status, "Open");
  assert.equal(updated.statusHistory.length, 0);
  setAIProvider(mockProvider);
});

test("5c. Provider authentication failure is logged as a categorized 503", async () => {
  setAIProvider({
    async analyzeComplaint() {
      const error = new Error("Gemini authentication failed");
      error.status = 401;
      throw error;
    }
  });
  const complaint = await Complaint.create({
    residentId,
    category: "Cleaning",
    description: "Cleaning service is needed in the lobby.",
    status: "Open",
    priority: "Low"
  });
  const response = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/ai-triage`)
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(response.status, 503);
  assert.equal(response.body.message, "AI analysis is temporarily unavailable. Please retry later.");
  setAIProvider(mockProvider);
});

test("5d. Multimodal evidence engine maps compatible categories to AGREEMENT", () => {
  const assessment = buildMultimodalAssessment({ triage: triageCleaning, visualAnalysis: visualWaste });
  assert.equal(assessment.state, "AGREEMENT");
  assert.equal(assessment.reviewRecommended, false);
});

test("5e. Multimodal evidence engine marks Cleaning and parking damage as CONFLICT", () => {
  const assessment = buildMultimodalAssessment({
    triage: triageCleaning,
    visualAnalysis: { category: "parking_road_damage", confidence: 0.92, topPredictions: [{ confidence: 0.92 }, { confidence: 0.03 }] }
  });
  assert.equal(assessment.state, "CONFLICT");
  assert.equal(assessment.reviewRecommended, true);
  assert.match(assessment.explanation, /different incident types/);
  assert.doesNotMatch(assessment.explanation, /corroborates/);
});

test("5f. Multimodal evidence engine maps Electrical and electrical hazard to AGREEMENT", () => {
  const assessment = buildMultimodalAssessment({ triage: { category: "Electrical" }, visualAnalysis: { category: "electrical_hazard", confidence: 0.9 } });
  assert.equal(assessment.state, "AGREEMENT");
});

test("5f-1. Cleaning and electrical hazard are CONFLICT", () => {
  const assessment = buildMultimodalAssessment({ triage: triageCleaning, visualAnalysis: { category: "electrical_hazard", confidence: 0.9 } });
  assert.equal(assessment.state, "CONFLICT");
});

test("5g. Low confidence and narrow prediction gap are UNCERTAIN", () => {
  assert.equal(buildMultimodalAssessment({ triage: triageCleaning, visualAnalysis: { category: "garbage_waste", confidence: 0.59 } }).state, "UNCERTAIN");
  assert.equal(buildMultimodalAssessment({ triage: triageCleaning, visualAnalysis: { category: "garbage_waste", confidence: 0.92, topPredictions: [{ confidence: 0.92 }, { confidence: 0.86 }] } }).state, "UNCERTAIN");
});

test("5h. Missing counterpart produces VISUAL_ONLY or TEXT_ONLY", () => {
  assert.equal(buildMultimodalAssessment({ visualAnalysis: visualWaste }).state, "VISUAL_ONLY");
  assert.equal(buildMultimodalAssessment({ triage: triageCleaning }).state, "TEXT_ONLY");
});

test("6. Invalid AI category enum output is safely rejected with controlled error", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Cleaning",
    description: "Corridor needs sweeping.",
    status: "Open",
    priority: "Low"
  });

  // Inject invalid category not in CATEGORY_VALUES enum
  mockProvider.setMockResponse({
    category: "FabricatedCategory",
    severity: "Low",
    urgency: "Low",
    recommendedPriority: "Low",
    summary: "Invalid output test.",
    suggestedAction: "Test action.",
    reasoning: "Test reasoning.",
    confidence: 0.9
  });

  const res = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/ai-triage`)
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(res.status, 503);

  // Clear custom mock response
  mockProvider.setMockResponse(null);
});

// ──────────────────────────────────────────────────────────
// Cosine Similarity Unit Tests (Phase 3B)
// ──────────────────────────────────────────────────────────

test("7. cosineSimilarity: identical vectors return 1.0", () => {
  const v = [0.1, 0.5, 0.9, 0.3];
  const result = cosineSimilarity(v, v);
  assert.ok(Math.abs(result - 1.0) < 1e-6, `Expected ~1.0, got ${result}`);
});

test("8. cosineSimilarity: orthogonal vectors return 0.0", () => {
  const a = [1, 0, 0];
  const b = [0, 1, 0];
  const result = cosineSimilarity(a, b);
  assert.ok(Math.abs(result) < 1e-6, `Expected ~0.0, got ${result}`);
});

test("9. cosineSimilarity: zero-magnitude vector returns 0 without error", () => {
  const a = [0, 0, 0];
  const b = [1, 2, 3];
  const result = cosineSimilarity(a, b);
  assert.equal(result, 0);
});

test("10. cosineSimilarity: mismatched lengths return 0", () => {
  const result = cosineSimilarity([1, 2], [1, 2, 3]);
  assert.equal(result, 0);
});

test("11. cosineSimilarity: similar vectors return high score", () => {
  const a = [0.9, 0.1, 0.05];
  const b = [0.88, 0.12, 0.06];
  const result = cosineSimilarity(a, b);
  assert.ok(result > 0.99, `Expected > 0.99, got ${result}`);
});

// ──────────────────────────────────────────────────────────
// Duplicate Detection Endpoint — RBAC (Phase 3B)
// ──────────────────────────────────────────────────────────

test("12. Unauthenticated find-duplicates request returns 401", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Leak in bathroom.",
    status: "Open",
    priority: "Medium"
  });

  const res = await request(app).post(`/api/admin/complaints/${complaint._id}/find-duplicates`);
  assert.equal(res.status, 401);
});

test("13. Resident find-duplicates request returns 403 Forbidden", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Leak in bathroom.",
    status: "Open",
    priority: "Medium"
  });

  const res = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/find-duplicates`)
    .set("Authorization", `Bearer ${residentToken}`);
  assert.equal(res.status, 403);
});

test("14. Admin find-duplicates returns 200 with matches array", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Electrical",
    description: "Sparking wire near the meter box.",
    status: "Open",
    priority: "High"
  });

  const res = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/find-duplicates`)
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(res.status, 200);
  assert.ok(res.body.data);
  assert.ok("matches" in res.body.data);
  assert.ok(Array.isArray(res.body.data.matches));
});

test("15. Self-exclusion: complaint is not in its own duplicate results", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Lift",
    description: "Lift stuck between floors, resident trapped.",
    status: "Open",
    priority: "High"
  });

  const res = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/find-duplicates`)
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(res.status, 200);
  const matchIds = res.body.data.matches.map((m) => String(m.complaintId));
  assert.ok(!matchIds.includes(String(complaint._id)), "Source complaint must not appear in its own results");
});

test("16. Embedding is generated, has 768 dimensions, and is persisted with gemini-embedding-2", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Heavy water leakage from burst pipe in kitchen.",
    status: "Open",
    priority: "High"
  });

  // No embedding before the call
  assert.ok(!complaint.aiEmbedding);

  await request(app)
    .post(`/api/admin/complaints/${complaint._id}/find-duplicates`)
    .set("Authorization", `Bearer ${adminToken}`);

  // Embedding should now be stored with gemini-embedding-2 and 768 dimensions
  const updated = await Complaint.findById(complaint._id);
  assert.ok(updated.aiEmbedding, "aiEmbedding should be stored after first call");
  assert.ok(Array.isArray(updated.aiEmbedding.vector), "vector should be an array");
  assert.equal(updated.aiEmbedding.vector.length, 768, "vector length must be 768 dimensions");
  assert.equal(updated.aiEmbedding.model, "gemini-embedding-2", "model must be gemini-embedding-2");
  assert.ok(updated.aiEmbedding.generatedAt, "generatedAt should be set");
});

test("17. Semantic similarity: two similar descriptions score above threshold", async () => {
  // Pre-seed a complaint WITH an embedding (as if it was previously analyzed)
  const normalizedText = normalizeComplaintText({
    category: "Plumbing",
    description: "Water is leaking badly through my bathroom ceiling."
  });
  const mockVector = await mockProvider.generateEmbedding(normalizedText);

  const existingComplaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Water is leaking badly through my bathroom ceiling.",
    status: "Open",
    priority: "High",
    aiEmbedding: {
      vector: mockVector,
      model: "gemini-embedding-2",
      generatedAt: new Date()
    }
  });

  // Source complaint with identical normalized representation
  const sourceComplaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Water is leaking badly through my bathroom ceiling.",
    status: "Open",
    priority: "High"
  });

  const res = await request(app)
    .post(`/api/admin/complaints/${sourceComplaint._id}/find-duplicates`)
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(res.status, 200);
  const matchIds = res.body.data.matches.map((m) => String(m.complaintId));
  assert.ok(matchIds.includes(String(existingComplaint._id)), "Identical description should appear as match");
});

test("18. find-duplicates for invalid complaint ID returns 404", async () => {
  const nonExistentId = new mongoose.Types.ObjectId();
  const res = await request(app)
    .post(`/api/admin/complaints/${nonExistentId}/find-duplicates`)
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(res.status, 404);
});

test("19. Matches do not expose sensitive fields (no email, no passwordHash)", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Security",
    description: "Security camera is not functioning near entrance gate.",
    status: "Open",
    priority: "Medium"
  });

  const res = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/find-duplicates`)
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(res.status, 200);
  for (const match of res.body.data.matches) {
    assert.ok(!match.email, "email must not be in match response");
    assert.ok(!match.passwordHash, "passwordHash must not be in match response");
    assert.ok(!match.residentId, "raw residentId ObjectId must not be in match response");
  }
});

// ──────────────────────────────────────────────────────────
// GeminiProvider & Embedding Modernization Tests (Hotfix)
// ──────────────────────────────────────────────────────────

test("20. GeminiProvider defaults to gemini-3.7-flash and gemini-embedding-2", () => {
  const defaultProvider = new GeminiProvider({ apiKey: "test-fake-key" });
  assert.equal(defaultProvider.model, "gemini-3.7-flash");
  assert.equal(defaultProvider.embeddingModel, "gemini-embedding-2");

  const customProvider = new GeminiProvider({
    apiKey: "test-fake-key",
    model: "custom-gemini-model",
    embeddingModel: "custom-embedding-model"
  });
  assert.equal(customProvider.model, "custom-gemini-model");
  assert.equal(customProvider.embeddingModel, "custom-embedding-model");
});

test("21. GeminiProvider correctly extracts output_text from Interactions API response", async () => {
  const provider = new GeminiProvider({ apiKey: "test-fake-key" });

  const mockPayload = {
    category: "Plumbing",
    severity: "High",
    urgency: "Urgent",
    recommendedPriority: "High",
    summary: "Burst pipe in kitchen.",
    suggestedAction: "Dispatch emergency plumber.",
    reasoning: "Risk of structural water damage.",
    confidence: 0.95
  };

  // Mock the ai.interactions client on provider
  provider.ai = {
    interactions: {
      create: async () => ({
        output_text: JSON.stringify(mockPayload)
      })
    }
  };

  const result = await provider.analyzeComplaint({
    description: "Burst pipe in kitchen flooding the area.",
    reportedCategory: "Plumbing"
  });

  assert.equal(result.category, "Plumbing");
  assert.equal(result.severity, "High");
  assert.equal(result.recommendedPriority, "High");
  assert.equal(result.model, "gemini/gemini-3.7-flash");
  assert.equal(result.confidence, 0.95);
});

test("21a. Gemini triage uses configurable timeout and low thinking level", async () => {
  assert.equal(env.ai.timeoutMs, 30000);
  const provider = new GeminiProvider({ apiKey: "test-fake-key" });
  let captured;
  provider.ai = {
    interactions: {
      create: async (request) => {
        captured = request;
        return { output_text: JSON.stringify({
          category: "Cleaning", severity: "Low", urgency: "Low", recommendedPriority: "Low",
          summary: "Cleanliness issue.", suggestedAction: "Schedule cleaning.", reasoning: "Waste was reported.", confidence: 0.9
        }) };
      }
    }
  };
  await provider.analyzeComplaint({ description: "Waste in lobby", reportedCategory: "Cleaning" });
  assert.equal(captured.model, "gemini-3.7-flash");
  assert.equal(captured.generation_config.thinking_level, "low");
});

test("21b. Gemini retries one transient 5xx and does not retry a 400", async () => {
  const provider = new GeminiProvider({ apiKey: "test-fake-key" });
  let attempts = 0;
  provider.ai = { interactions: { create: async () => {
    attempts += 1;
    if (attempts === 1) throw Object.assign(new Error("temporary upstream failure"), { status: 503 });
    return { output_text: JSON.stringify({ category: "Cleaning", severity: "Low", urgency: "Low", recommendedPriority: "Low", summary: "Cleanliness issue.", suggestedAction: "Schedule cleaning.", reasoning: "Waste was reported.", confidence: 0.9 }) };
  } } };
  const result = await provider.analyzeComplaint({ description: "Waste in lobby" });
  assert.equal(result.category, "Cleaning");
  assert.equal(attempts, 2);

  attempts = 0;
  provider.ai = { interactions: { create: async () => {
    attempts += 1;
    throw Object.assign(new Error("invalid request"), { status: 400 });
  } } };
  await assert.rejects(() => provider.analyzeComplaint({ description: "Waste in lobby" }));
  assert.equal(attempts, 1);
});

test("21c. Gemini quota errors are detected, normalized, and never retried", async () => {
  assert.equal(isQuotaExceeded({ status: 429 }), true);
  assert.equal(isQuotaExceeded({ statusCode: 429 }), true);
  assert.equal(isQuotaExceeded({ code: "too_many_requests" }), true);
  assert.equal(isQuotaExceeded(new Error("You exceeded your current quota for generate_content_free_tier_requests")), true);
  assert.equal(isQuotaExceeded(new Error("temporary network failure")), false);

  const provider = new GeminiProvider({ apiKey: "test-fake-key" });
  let attempts = 0;
  provider.ai = { interactions: { create: async () => {
    attempts += 1;
    throw Object.assign(new Error("You exceeded your current quota"), { status: 429 });
  } } };
  const startedAt = Date.now();
  await assert.rejects(
    () => provider.analyzeComplaint({ description: "Waste in lobby" }),
    (error) => error.code === "AI_QUOTA_EXCEEDED" && error.status === 429 && error.statusCode === 429 && error.message === "Gemini API quota exceeded."
  );
  assert.equal(attempts, 1);
  assert.ok(Date.now() - startedAt < 1000);
});

test("22. GeminiProvider.generateEmbedding invokes SDK with 768 dimensions and extracts values", async () => {
  const provider = new GeminiProvider({ apiKey: "test-fake-key" });
  const fake768Vector = Array.from({ length: 768 }, (_, i) => i * 0.001);

  let capturedConfig = null;
  provider.ai = {
    models: {
      embedContent: async (params) => {
        capturedConfig = params;
        return {
          embeddings: [{ values: fake768Vector }]
        };
      }
    }
  };

  const vector = await provider.generateEmbedding("Category: Lift\nDescription: Elevator stuck.");
  assert.equal(capturedConfig.model, "gemini-embedding-2");
  assert.equal(capturedConfig.config.outputDimensionality, 768);
  assert.equal(vector.length, 768);
});

test("23. Stale embeddings from incompatible model (text-embedding-004) are regenerated with gemini-embedding-2", async () => {
  // Complaint has stale embedding from text-embedding-004
  const staleComplaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Tap dripping in bathroom sink continuously.",
    status: "Open",
    priority: "Low",
    aiEmbedding: {
      vector: [0.1, 0.2, 0.3], // Stale small vector
      model: "text-embedding-004", // Incompatible model
      generatedAt: new Date(Date.now() - 86400000)
    }
  });

  const newVector = await generateAndStoreEmbedding(staleComplaint);
  assert.equal(newVector.length, 768);

  const reloaded = await Complaint.findById(staleComplaint._id);
  assert.equal(reloaded.aiEmbedding.model, "gemini-embedding-2");
  assert.equal(reloaded.aiEmbedding.vector.length, 768);
});

test("24. Cached embedding matching gemini-embedding-2 is reused without calling provider", async () => {
  const valid768Vector = Array.from({ length: 768 }, (_, i) => Math.cos(i));
  const complaint = await Complaint.create({
    residentId,
    category: "Electrical",
    description: "Main circuit breaker tripped in corridor.",
    status: "Open",
    priority: "High",
    aiEmbedding: {
      vector: valid768Vector,
      model: "gemini-embedding-2",
      generatedAt: new Date()
    }
  });

  const vector = await generateAndStoreEmbedding(complaint);
  assert.deepEqual(vector, valid768Vector);
});

test("25. normalizeComplaintText formats Category and Description cleanly without private fields", () => {
  const complaint = {
    category: "Plumbing",
    description: "Heavy leak in the kitchen pipe.",
    residentId: { name: "Secret Resident", email: "secret@example.com" },
    _id: "60c72b2f9b1d8b2badeee001"
  };

  const text = normalizeComplaintText(complaint);
  assert.equal(text, "Category: Plumbing\nDescription: Heavy leak in the kitchen pipe.");
  assert.ok(!text.includes("Secret Resident"));
  assert.ok(!text.includes("secret@example.com"));
  assert.ok(!text.includes("60c72b2f9b1d8b2badeee001"));
});

// ──────────────────────────────────────────────────────────
// Visual Intelligence Endpoint Tests (Phase 4A)
// ──────────────────────────────────────────────────────────

test("26. Unauthenticated visual analysis request returns 401", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Water leakage with photo evidence.",
    photoUrl: "https://res.cloudinary.com/demo/image/upload/leak.jpg",
    status: "Open",
    priority: "Medium"
  });

  const res = await request(app).post(`/api/admin/complaints/${complaint._id}/visual-analysis`);
  assert.equal(res.status, 401);
});

test("27. Resident visual analysis request returns 403 Forbidden", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Water leakage with photo evidence.",
    photoUrl: "https://res.cloudinary.com/demo/image/upload/leak.jpg",
    status: "Open",
    priority: "Medium"
  });

  const res = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/visual-analysis`)
    .set("Authorization", `Bearer ${residentToken}`);
  assert.equal(res.status, 403);
});

test("28. Visual analysis request for complaint without image returns 400 Bad Request", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Text-only complaint with no photo attached.",
    status: "Open",
    priority: "Medium"
  });

  const res = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/visual-analysis`)
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(res.status, 400);
  assert.ok(res.body.message.includes("photo"));
});

test("29. Visual analysis request for non-existent complaint ID returns 404", async () => {
  const nonExistentId = new mongoose.Types.ObjectId();
  const res = await request(app)
    .post(`/api/admin/complaints/${nonExistentId}/visual-analysis`)
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(res.status, 404);
});

test("30. Admin visual analysis returns 200 with structured visual intelligence and Grad-CAM artifacts", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Water dripping from pipe under kitchen sink.",
    photoUrl: "https://res.cloudinary.com/demo/image/upload/water_leak.jpg",
    status: "Open",
    priority: "Medium"
  });

  const res = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/visual-analysis`)
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(res.status, 200);
  assert.ok(res.body.data.visualAnalysis);
  const va = res.body.data.visualAnalysis;
  assert.equal(va.category, "Water Leakage");
  assert.ok(typeof va.confidence === "number");
  assert.ok(Array.isArray(va.topPredictions));
  assert.ok(va.model);
  assert.ok(va.overlayBase64.startsWith("data:image/png;base64,"));
  assert.ok(va.heatmapBase64.startsWith("data:image/png;base64,"));
  assert.ok(va.summary);
});

test("31. Visual analysis is persisted on complaint document", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Electrical",
    description: "Sparking wires in corridor panel.",
    photoUrl: "https://res.cloudinary.com/demo/image/upload/sparking_wire.jpg",
    status: "Open",
    priority: "High"
  });

  await request(app)
    .post(`/api/admin/complaints/${complaint._id}/visual-analysis`)
    .set("Authorization", `Bearer ${adminToken}`);

  const updated = await Complaint.findById(complaint._id);
  assert.ok(updated.visualAnalysis);
  assert.equal(updated.visualAnalysis.category, "Electrical Hazard");
  assert.ok(updated.visualAnalysis.generatedAt);
});

test("31a. Visual analysis persists artifact URLs without mutating complaint workflow", async () => {
  setMockVisualResponse({
    category: "wall_ceiling_damage",
    confidence: 0.88,
    topPredictions: [{ category: "wall_ceiling_damage", confidence: 0.88 }],
    model: "nivara-visual-classifier",
    overlayUrl: "https://res.cloudinary.com/demo/image/upload/visual-overlay.png",
    heatmapUrl: "https://res.cloudinary.com/demo/image/upload/visual-heatmap.png",
    summary: "Visual indicators suggest wall and ceiling damage."
  });

  const complaint = await Complaint.create({
    residentId,
    category: "Other",
    description: "Paint and plaster damage visible on the corridor wall.",
    photoUrl: "https://res.cloudinary.com/demo/image/upload/wall.jpg",
    status: "Open",
    priority: "Low",
    statusHistory: []
  });

  const res = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/visual-analysis`)
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.data.visualAnalysis.overlayUrl, "https://res.cloudinary.com/demo/image/upload/visual-overlay.png");
  assert.equal(res.body.data.visualAnalysis.heatmapUrl, "https://res.cloudinary.com/demo/image/upload/visual-heatmap.png");

  const updated = await Complaint.findById(complaint._id);
  assert.equal(updated.category, "Other");
  assert.equal(updated.priority, "Low");
  assert.equal(updated.status, "Open");
  assert.equal(updated.statusHistory.length, 0);
  setMockVisualResponse(null);
});

test("31b. CONFLICT assessment is persisted without changing complaint workflow fields", async () => {
  setMockVisualResponse({
    category: "parking_road_damage",
    confidence: 0.92,
    topPredictions: [{ category: "parking_road_damage", confidence: 0.92 }, { category: "garbage_waste", confidence: 0.02 }],
    model: "nivara-visual-classifier",
    summary: "Road-surface damage detected."
  });
  const complaint = await Complaint.create({
    residentId,
    category: "Cleaning",
    description: "Waste is reported near the parking entrance.",
    photoUrl: "https://res.cloudinary.com/demo/image/upload/parking.jpg",
    status: "Open",
    priority: "Low",
    statusHistory: [],
    aiTriage: {
      category: "Cleaning",
      severity: "Medium",
      urgency: "Normal",
      recommendedPriority: "Medium",
      summary: "Waste issue reported.",
      suggestedAction: "Inspect the reported area.",
      reasoning: "The description indicates a cleaning concern.",
      confidence: 0.9,
      model: "gemini/gemini-3.7-flash",
      generatedAt: new Date()
    }
  });
  const response = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/visual-analysis`)
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.data.multimodalAssessment.state, "CONFLICT");
  const updated = await Complaint.findById(complaint._id);
  assert.equal(updated.category, "Cleaning");
  assert.equal(updated.priority, "Low");
  assert.equal(updated.status, "Open");
  assert.equal(updated.statusHistory.length, 0);
  setMockVisualResponse(null);
});

test("32. Upstream visual service failure returns controlled 503 error", async () => {
  setMockVisualShouldFail(true);

  const complaint = await Complaint.create({
    residentId,
    category: "Lift",
    description: "Lift button panel cracked.",
    photoUrl: "https://res.cloudinary.com/demo/image/upload/lift_damage.jpg",
    status: "Open",
    priority: "Medium"
  });

  const res = await request(app)
    .post(`/api/admin/complaints/${complaint._id}/visual-analysis`)
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(res.status, 503);

  setMockVisualShouldFail(false);
});

test("33. Visual analysis does NOT mutate complaint status, priority, or category (Human-in-the-loop)", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Water leaking near meter.",
    photoUrl: "https://res.cloudinary.com/demo/image/upload/water.jpg",
    status: "Open",
    priority: "Low"
  });

  await request(app)
    .post(`/api/admin/complaints/${complaint._id}/visual-analysis`)
    .set("Authorization", `Bearer ${adminToken}`);

  const reloaded = await Complaint.findById(complaint._id);
  assert.equal(reloaded.status, "Open", "Status must remain unchanged");
  assert.equal(reloaded.priority, "Low", "Priority must remain unchanged");
  assert.equal(reloaded.category, "Plumbing", "Category must remain unchanged");
});

test("34. Visual analysis does NOT mutate statusHistory audit log", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Cleaning",
    description: "Overflowing bin in lobby.",
    photoUrl: "https://res.cloudinary.com/demo/image/upload/garbage.jpg",
    status: "Open",
    priority: "Medium",
    statusHistory: []
  });

  await request(app)
    .post(`/api/admin/complaints/${complaint._id}/visual-analysis`)
    .set("Authorization", `Bearer ${adminToken}`);

  const reloaded = await Complaint.findById(complaint._id);
  assert.equal(reloaded.statusHistory.length, 0, "statusHistory must not be modified by visual analysis");
});

// ──────────────────────────────────────────────────────────
// Phase 4B: Visual Feedback & Human-in-the-Loop Tests
// ──────────────────────────────────────────────────────────

test("35. POST /api/complaints/:id/visual-feedback records positive feedback (accepted: true)", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Water pipe leaking heavily.",
    photoUrl: "https://res.cloudinary.com/demo/image/upload/pipe.jpg",
    status: "Open",
    priority: "High",
    visualAnalysis: {
      category: "Water Leakage",
      confidence: 0.94,
      model: "nivara-visual-classifier",
      generatedAt: new Date()
    }
  });

  const res = await request(app)
    .post(`/api/complaints/${complaint._id}/visual-feedback`)
    .set("Authorization", `Bearer ${residentToken}`)
    .send({ accepted: true });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.visualFeedback.accepted, true);
  assert.equal(res.body.data.visualFeedback.prediction, "Water Leakage");
  assert.equal(res.body.data.visualFeedback.reviewerRole, "resident");

  const reloaded = await Complaint.findById(complaint._id);
  assert.ok(reloaded.visualFeedback);
  assert.equal(reloaded.visualFeedback.accepted, true);
});

test("36. POST /api/complaints/:id/visual-feedback records correction (accepted: false, correctedCategory)", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Stain on wall ceiling.",
    photoUrl: "https://res.cloudinary.com/demo/image/upload/stain.jpg",
    status: "Open",
    priority: "Medium",
    visualAnalysis: {
      category: "Water Leakage",
      confidence: 0.82,
      model: "nivara-visual-classifier",
      generatedAt: new Date()
    }
  });

  const res = await request(app)
    .post(`/api/complaints/${complaint._id}/visual-feedback`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ accepted: false, correctedCategory: "Wall/Ceiling Damage" });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.visualFeedback.accepted, false);
  assert.equal(res.body.data.visualFeedback.correctedCategory, "Wall/Ceiling Damage");
  assert.equal(res.body.data.visualFeedback.reviewerRole, "admin");

  const reloaded = await Complaint.findById(complaint._id);
  assert.equal(reloaded.visualFeedback.accepted, false);
  assert.equal(reloaded.visualFeedback.correctedCategory, "Wall/Ceiling Damage");
});

test("37. POST /api/complaints/:id/visual-feedback rejects invalid correctedCategory (400)", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Minor drip.",
    photoUrl: "https://res.cloudinary.com/demo/image/upload/drip.jpg",
    status: "Open",
    priority: "Low",
    visualAnalysis: {
      category: "Water Leakage",
      confidence: 0.75,
      model: "nivara-visual-classifier",
      generatedAt: new Date()
    }
  });

  const res = await request(app)
    .post(`/api/complaints/${complaint._id}/visual-feedback`)
    .set("Authorization", `Bearer ${residentToken}`)
    .send({ accepted: false, correctedCategory: "NotAValidCategory" });

  assert.equal(res.status, 400);
  assert.ok(res.body.message.includes("Invalid correctedCategory"));
});

test("38. POST /api/complaints/:id/visual-feedback returns 400 when no visualAnalysis exists", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Complaint without visual analysis.",
    status: "Open",
    priority: "Low"
  });

  const res = await request(app)
    .post(`/api/complaints/${complaint._id}/visual-feedback`)
    .set("Authorization", `Bearer ${residentToken}`)
    .send({ accepted: true });

  assert.equal(res.status, 400);
});

test("39. Visual feedback does NOT mutate complaint status, priority, or category (Human-in-the-loop)", async () => {
  const complaint = await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Issue description.",
    photoUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    status: "Open",
    priority: "Medium",
    visualAnalysis: {
      category: "Garbage/Waste",
      confidence: 0.90,
      model: "nivara-visual-classifier",
      generatedAt: new Date()
    }
  });

  await request(app)
    .post(`/api/complaints/${complaint._id}/visual-feedback`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ accepted: false, correctedCategory: "Wall/Ceiling Damage" });

  const reloaded = await Complaint.findById(complaint._id);
  assert.equal(reloaded.status, "Open", "Status must remain Open");
  assert.equal(reloaded.priority, "Medium", "Priority must remain Medium");
  assert.equal(reloaded.category, "Plumbing", "Category must remain Plumbing (unchanged by AI feedback)");
});




