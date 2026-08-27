import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/society_maintenance_tracker",
  jwtSecret: process.env.JWT_SECRET || "development-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  overdueDays: Number(process.env.OVERDUE_DAYS || 3),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || "Society Maintenance <no-reply@example.com>"
  },
  ai: {
    provider: process.env.AI_PROVIDER || "gemini",
    geminiApiKey: process.env.GEMINI_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    model: process.env.AI_MODEL || "gemini-3.7-flash",
    embeddingModel: process.env.AI_EMBEDDING_MODEL || "gemini-embedding-2",
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || 30000),
    duplicateThreshold: Number(process.env.AI_DUPLICATE_THRESHOLD || 0.85),
    duplicateLimit: Number(process.env.AI_DUPLICATE_LIMIT || 5)
  },
  visualAi: {
    enabled: process.env.VISUAL_AI_ENABLED !== "false",
    url: process.env.VISUAL_AI_URL || "http://localhost:8001",
    timeout: Number(process.env.VISUAL_AI_TIMEOUT || 15000),
    confidenceThreshold: Number(process.env.VISUAL_AI_CONFIDENCE_THRESHOLD || 0.8),
    ambiguityGap: Number(process.env.VISUAL_AI_AMBIGUITY_GAP || 0.1)
  }
};
