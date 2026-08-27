import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export function isEmailConfigured() {
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

export async function verifySmtpConnection() {
  if (!isEmailConfigured()) {
    console.log("SMTP not configured.");
    return false;
  }
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.log("SMTP not configured.");
      return false;
    }
    await transporter.verify();
    console.log("[SMTP] Transporter verified successfully and ready to send emails.");
    return true;
  } catch (error) {
    console.error(`[SMTP] Verification failed: ${error.message}`);
    return false;
  }
}

function formatDisplayDate(date) {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  return d.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export async function sendStatusChangeEmail({
  to,
  complaintId,
  category = "General",
  previousStatus,
  newStatus,
  note,
  timestamp = new Date()
}) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log("SMTP not configured.");
    return;
  }

  const shortId = String(complaintId).slice(-6);
  const formattedTime = formatDisplayDate(timestamp);
  const complaintLink = env.clientUrl
    ? `${env.clientUrl}/resident/complaints/${complaintId}`
    : "#";

  const statusColorMap = {
    Open: "#0284c7",
    "In Progress": "#d97706",
    Resolved: "#059669"
  };
  const badgeColor = statusColorMap[newStatus] || "#2563eb";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complaint Status Update</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #090d16; padding: 24px 32px; text-align: left;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">NIVARA Operations</h1>
              <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">Intelligent Property Operations Platform</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <div style="margin-bottom: 20px;">
                <span style="display: inline-block; background-color: ${badgeColor}; color: #ffffff; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Status: ${newStatus}
                </span>
              </div>

              <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 18px; font-weight: 600;">
                Your Complaint #${shortId} Has Been Updated
              </h2>
              <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.5;">
                The maintenance team has recorded a status update on your request.
              </p>

              <!-- Meta Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; width: 35%; font-weight: 600;">Complaint ID</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-family: monospace; font-weight: 600;">#${complaintId}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">Category</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 500;">${category}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">Previous Status</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">${previousStatus || "N/A"}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">New Status</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: ${badgeColor}; font-weight: 700;">${newStatus}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">Updated At</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a;">${formattedTime}</td>
                </tr>
                ${
                  note
                    ? `<tr>
                        <td style="padding: 12px 16px; font-size: 13px; color: #64748b; font-weight: 600; vertical-align: top;">Note</td>
                        <td style="padding: 12px 16px; font-size: 13px; color: #0f172a; font-style: italic;">&ldquo;${note}&rdquo;</td>
                      </tr>`
                    : ""
                }
              </table>

              ${
                env.clientUrl
                  ? `<div style="text-align: center; margin-top: 28px;">
                      <a href="${complaintLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        View Complaint Details &rarr;
                      </a>
                    </div>`
                  : ""
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                You are receiving this automated notification because you submitted a request on NIVARA.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = [
    `NIVARA Property Operations Update`,
    `----------------------------------------`,
    `Complaint ID: ${complaintId}`,
    `Category: ${category}`,
    `Previous Status: ${previousStatus || "N/A"}`,
    `New Status: ${newStatus}`,
    `Note: ${note || "No note provided"}`,
    `Updated At: ${formattedTime}`,
    env.clientUrl ? `Link: ${complaintLink}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject: `[NIVARA] Complaint #${shortId} status updated to ${newStatus}`,
      text,
      html
    });
  } catch (error) {
    console.error(`Status email failed for ${to}: ${error.message}`);
  }
}

export async function sendImportantNoticeEmail({
  recipients,
  title,
  content,
  isUpdate = false,
  timestamp = new Date()
}) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log("SMTP not configured.");
    return;
  }

  if (!recipients || !recipients.length) return;

  const formattedTime = formatDisplayDate(timestamp);
  const noticesLink = env.clientUrl ? `${env.clientUrl}/resident/notices` : "#";
  const subjectPrefix = isUpdate ? "Important Notice Updated" : "Important Notice";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #fde68a; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #090d16; padding: 24px 32px; text-align: left;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">NIVARA Announcement</h1>
              <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">Important Community Operations Notice</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <div style="margin-bottom: 16px;">
                <span style="display: inline-block; background-color: #d97706; color: #ffffff; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${isUpdate ? "⚠ Notice Updated" : "★ Important Announcement"}
                </span>
              </div>

              <h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
                ${title}
              </h2>
              <p style="margin: 0 0 20px 0; color: #64748b; font-size: 12px;">
                Published on ${formattedTime}
              </p>

              <!-- Content box -->
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
                <div style="color: #1e293b; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${content}</div>
              </div>

              ${
                env.clientUrl
                  ? `<div style="text-align: center; margin-top: 28px;">
                      <a href="${noticesLink}" style="display: inline-block; background-color: #090d16; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        View All Notices on NIVARA &rarr;
                      </a>
                    </div>`
                  : ""
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                You are receiving this official communication as a registered resident on NIVARA.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = [
    `[${subjectPrefix}] ${title}`,
    `----------------------------------------`,
    `Published: ${formattedTime}`,
    ``,
    content,
    ``,
    env.clientUrl ? `View notices online: ${noticesLink}` : ""
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  try {
    await transporter.sendMail({
      from: env.smtp.from,
      bcc: recipients,
      subject: `[NIVARA] ${subjectPrefix}: ${title}`,
      text,
      html
    });
  } catch (error) {
    console.error(`Important notice email failed: ${error.message}`);
  }
}
