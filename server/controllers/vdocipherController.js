const crypto = require("crypto");
const Lesson = require("../models/lessonModel");
const { getUploadCredentials } = require("../utils/vdocipher");
const { recalculateCourseStats } = require("../utils/courseHelpers");
const logger = require("../config/logger");

const safeEqual = (a, b) => {
  try {
    const left = Buffer.from(String(a), "utf8");
    const right = Buffer.from(String(b), "utf8");
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
};

const verifyVdocipherWebhook = (req) => {
  const secret = process.env.VDOCIPHER_WEBHOOK_SECRET;
  if (!secret) return true;

  // VdoCipher's documented approach: secret as ?token= in the webhook URL.
  const urlToken = req.query?.token;
  if (urlToken && safeEqual(urlToken, secret)) {
    return true;
  }

  // Optional fallback for providers that send HMAC signature headers.
  const signature =
    req.headers["x-vdocipher-signature"] ||
    req.headers["x-webhook-signature"] ||
    req.headers["authorization"];

  if (!signature) return false;

  const rawBody = req.rawBody || JSON.stringify(req.body || {});
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const provided = String(signature)
    .replace(/^sha256=/i, "")
    .trim();
  return safeEqual(provided, expected);
};
exports.getUploadCredentials = async (req, res) => {
  try {
    const { title, folderId } = req.body;
    const data = await getUploadCredentials(title, folderId);

    res.status(200).json({
      clientPayload: data.clientPayload,
      videoId: data.videoId,
    });
  } catch (error) {
    console.error("VdoCipher upload credentials error:", error);
    res.status(error.status || 500).json({
      message: error.message || "Failed to get upload credentials",
    });
  }
};

exports.handleVdocipherWebhook = async (req, res) => {
  try {
    if (!verifyVdocipherWebhook(req)) {
      logger.warn("VdoCipher webhook rejected: invalid token or signature");
      return res
        .status(401)
        .json({ message: "Invalid webhook authentication" });
    }
    const { event, payload } = req.body || {};

    if (event !== "video:ready" || !payload?.id) {
      return res.status(200).json({ received: true, ignored: true });
    }

    const videoId = payload.id;
    const durationSeconds = Number(payload.length) || 0;

    const lessons = await Lesson.find({
      "video.vdoCipherVideoId": videoId,
    });

    if (lessons.length === 0) {
      logger.info(`VdoCipher webhook: no lesson for video ${videoId}`);
      return res.status(200).json({ received: true, matched: 0 });
    }

    const courseIds = new Set();

    for (const lesson of lessons) {
      lesson.video = lesson.video || {};
      lesson.video.encodingStatus = "ready";
      lesson.video.provider = "vdocipher";
      if (durationSeconds > 0) {
        lesson.video.durationSeconds = durationSeconds;
      }
      await lesson.save();
      courseIds.add(String(lesson.courseId));
    }

    for (const courseId of courseIds) {
      await recalculateCourseStats(courseId);
    }

    logger.info(
      `VdoCipher webhook: video ${videoId} ready, updated ${lessons.length} lesson(s)`,
    );

    res.status(200).json({ received: true, updated: lessons.length });
  } catch (error) {
    console.error("VdoCipher webhook error:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
};
