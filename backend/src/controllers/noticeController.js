import { Notice } from "../models/Notice.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";
import { sendImportantNoticeEmail } from "../services/emailService.js";

export const getNotices = asyncHandler(async (req, res) => {
  const notices = await Notice.find().populate("createdBy", "name email role").sort({ isImportant: -1, createdAt: -1 });
  sendResponse(res, 200, "Notices", { notices });
});

export const createNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.create({
    title: req.body.title,
    content: req.body.content,
    isImportant: Boolean(req.body.isImportant),
    createdBy: req.user._id
  });

  if (notice.isImportant) {
    const residents = await User.find({ role: "resident" }).select("email");
    await sendImportantNoticeEmail({
      recipients: residents.map((resident) => resident.email),
      title: notice.title,
      content: notice.content
    });
  }

  sendResponse(res, 201, "Notice created", { notice });
});

export const updateNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.findById(req.params.id);
  if (!notice) throw new ApiError(404, "Notice not found");

  const wasImportant = notice.isImportant;

  for (const key of ["title", "content", "isImportant"]) {
    if (req.body[key] !== undefined) notice[key] = req.body[key];
  }
  await notice.save();

  const importantContentChanged =
    wasImportant &&
    notice.isImportant &&
    (req.body.title !== undefined || req.body.content !== undefined);

  if ((notice.isImportant && !wasImportant) || importantContentChanged) {
    const residents = await User.find({ role: "resident" }).select("email");
    await sendImportantNoticeEmail({
      recipients: residents.map((resident) => resident.email),
      title: notice.title,
      content: notice.content,
      isUpdate: true,
      timestamp: notice.updatedAt || new Date()
    });
  }

  sendResponse(res, 200, "Notice updated", { notice });
});

export const deleteNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.findById(req.params.id);
  if (!notice) throw new ApiError(404, "Notice not found");
  await notice.deleteOne();
  sendResponse(res, 200, "Notice deleted");
});
