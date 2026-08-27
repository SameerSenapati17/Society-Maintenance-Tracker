import { BaseAIProvider } from "./aiProvider.js";
import { TRIAGE_SYSTEM_PROMPT } from "./schemas.js";
import { env } from "../../config/env.js";

let GoogleGenAI = null;
try {
  const sdk = await import("@google/genai");
  GoogleGenAI = sdk.GoogleGenAI || sdk.default?.GoogleGenAI;
} catch {
  // Allows offline development and tests without requiring @google/genai in node_modules
}

function cleanJsonOutput(text) {
  if (!text) return null;
  const trimmed = text.trim();
  // Strip Markdown code blocks if present: ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;
}

function providerStatus(error) {
  return Number(error?.status || error?.statusCode || error?.response?.status || 0);
}

export function isQuotaExceeded(error) {
  const status = providerStatus(error);
  const code = String(error?.code || error?.error?.code || error?.response?.data?.error?.status || error?.response?.data?.error?.code || "").toLowerCase();
  const message = String(error?.message || error?.response?.data?.error?.message || "").toLowerCase();
  return status === 429 || code === "too_many_requests" || message.includes("quota exceeded") || message.includes("current quota") || message.includes("free_tier_requests");
}

function createQuotaError() {
  const error = new Error("Gemini API quota exceeded.");
  error.code = "AI_QUOTA_EXCEEDED";
  error.status = 429;
  error.statusCode = 429;
  return error;
}

function isTransient(error) {
  const status = providerStatus(error);
  const message = String(error?.message || "").toLowerCase();
  return error?.name === "AbortError" || message.includes("timed out") || message.includes("timeout") || status >= 500 || message.includes("fetch failed") || message.includes("network");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GeminiProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    this.model = config.model || process.env.AI_MODEL || "gemini-3.7-flash";
    this.embeddingModel = config.embeddingModel || process.env.AI_EMBEDDING_MODEL || "gemini-embedding-2";
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta";

    if (this.apiKey && GoogleGenAI) {
      try {
        this.ai = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (err) {
        console.warn("[GeminiProvider] Failed to initialize GoogleGenAI client:", err.message);
        this.ai = null;
      }
    } else {
      this.ai = null;
    }
  }

  async analyzeComplaint(complaintData) {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment.");
    }

    const userPrompt = `INCIDENT REPORT FOR TRIAGE:
- Resident Description: "${complaintData.description}"
- Resident-Selected Category: "${complaintData.reportedCategory || "Not Specified"}"
- Submission Date: "${complaintData.createdAt ? new Date(complaintData.createdAt).toISOString() : new Date().toISOString()}"
- Evidence Photo Attached: ${complaintData.hasPhoto ? "Yes" : "No"}

Perform operations triage and output the structured JSON matching the defined schema.`;

    const executeRequest = async () => {
      let rawText = null;
      const requestInput = userPrompt;

      if (!this.ai?.interactions || typeof this.ai.interactions.create !== "function") {
        throw new Error("Gemini Interactions API is unavailable.");
      }

      let interaction;
      try {
        interaction = await this.ai.interactions.create({
          model: this.model,
          system_instruction: TRIAGE_SYSTEM_PROMPT,
          input: `${userPrompt}

      IMPORTANT: Respond with valid JSON only matching schema.`,
          generation_config: {
            thinking_level: "low",
            max_output_tokens: 500
          }
        });
      } catch (error) {
        if (isQuotaExceeded(error)) throw createQuotaError();
        throw error;
      }
      rawText = interaction?.output_text || (typeof interaction === "string" ? interaction : null);

      if (!rawText) {
        throw new Error("Empty candidate response returned from Gemini API.");
      }

      const cleaned = cleanJsonOutput(rawText);
      const parsed = JSON.parse(cleaned);

      return {
        ...parsed,
        model: `gemini/${this.model}`
      };
    };

    const startedAt = Date.now();
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      console.info("[NIVARA Gemini Triage] request start", { provider: "gemini", model: this.model, attempt });
      let timeoutId;
      try {
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(Object.assign(new Error(`Gemini API request timed out after ${env.ai.timeoutMs}ms.`), { code: "AI_TIMEOUT" })), env.ai.timeoutMs);
        });
        const result = await Promise.race([executeRequest(), timeoutPromise]);
        clearTimeout(timeoutId);
        console.info("[NIVARA Gemini Triage] request complete", { provider: "gemini", model: this.model, attempt, durationMs: Date.now() - startedAt });
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        if (isQuotaExceeded(error)) {
          const quotaError = createQuotaError();
          console.error("[NIVARA Gemini Triage] quota exceeded", {
            provider: "gemini",
            model: this.model,
            status: 429,
            attempt,
            durationMs: Date.now() - startedAt,
            category: "quota_exceeded"
          });
          throw quotaError;
        }
        const retryable =
          attempt < 2 &&
          providerStatus(error) >= 500 &&
          providerStatus(error) < 600;
        console.error("[NIVARA Gemini Triage] request error", { provider: "gemini", model: this.model, attempt, durationMs: Date.now() - startedAt, status: providerStatus(error) || undefined, errorType: error?.code === "AI_TIMEOUT" ? "provider_timeout" : error?.name || "Error", retrying: retryable });
        if (!retryable) throw error;
        await delay(500);
      }
    }
  }

  async generateEmbedding(text) {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment.");
    }

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Gemini embedding request timed out after ${env.ai.timeoutMs}ms.`)), env.ai.timeoutMs);
    });

    const executionPromise = (async () => {
      // 1. Primary: Use official @google/genai SDK with gemini-embedding-2 and 768 dimensions
      if (this.ai && this.ai.models && typeof this.ai.models.embedContent === "function") {
        const response = await this.ai.models.embedContent({
          model: this.embeddingModel,
          contents: text,
          config: {
            outputDimensionality: 768
          }
        });
        const vector = response?.embeddings?.[0]?.values || response?.embedding?.values || response?.values;
        if (Array.isArray(vector) && vector.length > 0) {
          return vector;
        }
      }

      // 2. Direct HTTPS fallback for gemini-embedding-2
      const endpoint = `${this.baseUrl}/models/${this.embeddingModel}:embedContent?key=${encodeURIComponent(this.apiKey)}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          outputDimensionality: 768
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Embedding error [HTTP ${response.status}]: ${errText.slice(0, 200)}`);
      }

      const json = await response.json();
      const vector = json.embedding?.values || json.embeddings?.[0]?.values || [];
      if (!Array.isArray(vector) || vector.length === 0) {
        throw new Error("Empty embedding returned from Gemini API.");
      }
      return vector;
    })();

    return Promise.race([executionPromise, timeoutPromise]);
  }
}
