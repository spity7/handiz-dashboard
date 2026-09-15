const crypto = require("crypto");
const Course = require("../models/courseModel");
const CourseModule = require("../models/courseModuleModel");
const Lesson = require("../models/lessonModel");
const {
  getUploadCredentials,
  deleteVideo,
  buildLessonVideoTitle,
  isFolderNotFoundError,
} = require("../utils/vdocipher");
const {
  ensureCourseVdocipherFolder,
  ensureModuleVdocipherFolder,
  entityBelongsToCourse,
} = require("../utils/courseHelpers");
const {
  mapVdocipherStatusToEncodingStatus,
  updateLessonsForVdocipherVideo,
} = require("../utils/vdocipherLessonVideo");
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
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

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
    const { title, courseId, moduleTitle, moduleId } = req.body;
    let folderId;
    let usedModuleFolder = false;

    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (moduleId) {
        const module = await CourseModule.findById(moduleId);
        if (module && entityBelongsToCourse(module, course._id)) {
          folderId = await ensureModuleVdocipherFolder(course, module);
          usedModuleFolder = true;
        } else {
          folderId = await ensureCourseVdocipherFolder(course);
        }
      } else {
        folderId = await ensureCourseVdocipherFolder(course);
      }
    }

    const videoTitle = usedModuleFolder
      ? String(title || "").trim() || "Untitled lesson"
      : buildLessonVideoTitle({
          moduleTitle,
          lessonTitle: title,
        });

    let data;
    try {
      data = await getUploadCredentials(videoTitle, folderId);
    } catch (uploadError) {
      if (courseId && isFolderNotFoundError(uploadError)) {
        logger.warn(
          `VdoCipher upload folder missing (course ${courseId}, folder ${folderId}); recreating course folder`,
        );
        const course = await Course.findById(courseId);
        if (course) {
          course.vdoCipherFolderId = "";
          await course.save();
          folderId = await ensureCourseVdocipherFolder(course);
          data = await getUploadCredentials(videoTitle, folderId);
        } else {
          throw uploadError;
        }
      } else {
        throw uploadError;
      }
    }

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

exports.deleteUploadedVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    if (!videoId) {
      return res.status(400).json({ message: "videoId is required" });
    }

    const referencedLesson = await Lesson.findOne({
      "video.vdoCipherVideoId": videoId,
    }).select("_id");

    if (referencedLesson) {
      return res.status(409).json({
        message:
          "Video is attached to a lesson and cannot be deleted this way.",
      });
    }

    await deleteVideo(videoId);
    res.status(200).json({ message: "Video deleted" });
  } catch (error) {
    console.error("VdoCipher delete video error:", error);
    res.status(error.status || 500).json({
      message: error.message || "Failed to delete video",
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

    if (!payload?.id) {
      return res.status(200).json({ received: true, ignored: true });
    }

    if (event !== "video:ready" && event !== "video:readyall") {
      return res.status(200).json({ received: true, ignored: true });
    }

    const videoId = payload.id;
    const durationSeconds = Number(payload.length) || 0;
    const encodingStatus = mapVdocipherStatusToEncodingStatus(
      payload.status || "ready",
    );

    const { matched, updated, courseIds } =
      await updateLessonsForVdocipherVideo(videoId, {
        encodingStatus,
        durationSeconds,
      });

    if (matched === 0) {
      logger.info(`VdoCipher webhook: no lesson for video ${videoId}`);
      return res.status(200).json({ received: true, matched: 0 });
    }

    logger.info(
      `VdoCipher webhook: video ${videoId} ${encodingStatus}, updated ${updated} lesson(s)`,
    );

    res.status(200).json({
      received: true,
      updated,
      encodingStatus,
      courseIds,
    });
  } catch (error) {
    console.error("VdoCipher webhook error:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
};
