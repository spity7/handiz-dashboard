const Lesson = require("../models/lessonModel");
const logger = require("../config/logger");
const { getVideo } = require("./vdocipher");
const { recalculateCourseStats } = require("./courseHelpers");

/**
 * Map VdoCipher video.status to lesson.video.encodingStatus.
 * @see https://www.vdocipher.com/docs/server/account/hooks/
 */
const mapVdocipherStatusToEncodingStatus = (status) => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();

  if (normalized === "ready") return "ready";
  if (normalized === "failed") return "failed";
  if (
    normalized === "processing" ||
    normalized === "queued" ||
    normalized === "pre-upload"
  ) {
    return "processing";
  }

  return "processing";
};

const extractVdocipherVideoFields = (data) => {
  const video =
    data?.video && typeof data.video === "object" ? data.video : data;
  return {
    status: video?.status,
    durationSeconds: Number(video?.length) || 0,
  };
};

const applyEncodingUpdateToLesson = async (
  lesson,
  { encodingStatus, durationSeconds },
) => {
  const prevStatus = lesson.video?.encodingStatus;
  lesson.video = lesson.video || {};
  lesson.video.provider = "vdocipher";
  lesson.video.encodingStatus = encodingStatus;

  if (durationSeconds > 0) {
    lesson.video.durationSeconds = durationSeconds;
  }

  await lesson.save();

  if (encodingStatus === "ready" && prevStatus !== "ready") {
    await recalculateCourseStats(lesson.courseId);
  }

  return lesson;
};

/**
 * Poll VdoCipher when webhook delivery fails; updates the lesson when status changes.
 */
const syncLessonVideoFromVdocipher = async (lesson) => {
  const videoId = lesson.video?.vdoCipherVideoId;
  if (!videoId || lesson.video?.encodingStatus === "ready") {
    return { lesson, synced: false };
  }

  try {
    const data = await getVideo(videoId);
    const { status, durationSeconds } = extractVdocipherVideoFields(data);
    const encodingStatus = mapVdocipherStatusToEncodingStatus(status);

    if (
      encodingStatus === lesson.video.encodingStatus &&
      (durationSeconds <= 0 || durationSeconds === lesson.video.durationSeconds)
    ) {
      return { lesson, synced: false };
    }

    await applyEncodingUpdateToLesson(lesson, {
      encodingStatus,
      durationSeconds,
    });

    logger.info(
      `VdoCipher sync: video ${videoId} → ${encodingStatus} (lesson ${lesson._id})`,
    );

    return { lesson, synced: true, encodingStatus };
  } catch (error) {
    logger.warn(`VdoCipher sync failed for video ${videoId}: ${error.message}`);
    return { lesson, synced: false, error };
  }
};

const updateLessonsForVdocipherVideo = async (
  videoId,
  { encodingStatus, durationSeconds = 0 },
) => {
  const lessons = await Lesson.find({
    "video.vdoCipherVideoId": videoId,
  });

  if (lessons.length === 0) {
    return { matched: 0, updated: 0, courseIds: [] };
  }

  const courseIds = new Set();

  for (const lesson of lessons) {
    await applyEncodingUpdateToLesson(lesson, {
      encodingStatus,
      durationSeconds,
    });
    courseIds.add(String(lesson.courseId));
  }

  return {
    matched: lessons.length,
    updated: lessons.length,
    courseIds: [...courseIds],
  };
};

/** Poll VdoCipher for lessons still encoding (webhook fallback for admin UI). */
const syncPendingLessonEncodingsForCourse = async (courseId) => {
  const lessons = await Lesson.find({
    courseId,
    "video.vdoCipherVideoId": { $nin: [null, ""] },
    "video.encodingStatus": { $nin: ["ready", "failed"] },
  });

  if (lessons.length === 0) {
    return { checked: 0, synced: 0 };
  }

  const results = await Promise.all(
    lessons.map((lesson) => syncLessonVideoFromVdocipher(lesson)),
  );

  return {
    checked: lessons.length,
    synced: results.filter((result) => result.synced).length,
  };
};

module.exports = {
  mapVdocipherStatusToEncodingStatus,
  extractVdocipherVideoFields,
  syncLessonVideoFromVdocipher,
  syncPendingLessonEncodingsForCourse,
  updateLessonsForVdocipherVideo,
};
