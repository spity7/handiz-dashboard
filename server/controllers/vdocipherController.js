const Lesson = require("../models/lessonModel");
const { getUploadCredentials } = require("../utils/vdocipher");
const { recalculateCourseStats } = require("../utils/courseHelpers");
const logger = require("../config/logger");

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
