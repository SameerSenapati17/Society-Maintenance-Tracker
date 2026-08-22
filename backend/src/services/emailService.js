import nodemailer from "nodemailer";
import { env } from "../config/env.js";

function isEmailConfigured() {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
}

function getTransporter() {
  if (!isEmailConfigured()) return null;
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass }
  });
}

export async function sendStatusChangeEmail({ to, complaintId, previousStatus, newStatus, note, timestamp }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("SMTP is not configured. Skipping status change email.");
    return;
  }

  try {
    await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject: `Complaint ${complaintId} status updated`,
      text: [
        `Complaint ID: ${complaintId}`,
        `Previous status: ${previousStatus}`,
        `New status: ${newStatus}`,
        `Note: ${note || "No note provided"}`,
        `Timestamp: ${timestamp.toISOString()}`
      ].join("\n")
    });
  } catch (error) {
    console.error(`Status email failed for ${to}: ${error.message}`);
  }
}

export async function sendImportantNoticeEmail({ recipients, title, content }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("SMTP is not configured. Skipping important notice email.");
    return;
  }

  try {
    await transporter.sendMail({
      from: env.smtp.from,
      bcc: recipients,
      subject: `Important Society Notice: ${title}`,
      text: `Important society notice\n\n${title}\n\n${content}`
    });
  } catch (error) {
    console.error(`Important notice email failed: ${error.message}`);
  }
}
