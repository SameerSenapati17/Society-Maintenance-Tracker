import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { authRoutes } from "./routes/authRoutes.js";
import { adminComplaintRoutes, complaintRoutes } from "./routes/complaintRoutes.js";
import { adminNoticeRoutes, noticeRoutes } from "./routes/noticeRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

export const app = express();

app.use(helmet());
const allowedOrigins = env.clientUrl
  ? env.clientUrl.split(",").map((url) => url.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*") || process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      return callback(null, origin);
    },
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  const cloudinaryConfigured = Boolean(
    env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret
  );
  const smtpConfigured = Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

  res.json({
    success: true,
    message: "OK",
    data: {
      cloudinaryConfigured,
      smtpConfigured
    }
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/admin", adminComplaintRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/admin", adminNoticeRoutes);

app.use(notFound);
app.use(errorHandler);
