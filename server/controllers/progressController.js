const Lesson = require("../models/lessonModel");
const Course = require("../models/courseModel");
const Enrollment = require("../models/enrollmentModel");
const LessonProgress = require("../models/lessonProgressModel");
const { ENROLLMENT_STATUS } = require("../constants/enrollmentStatus");
const {
  recalculateEnrollmentProgress,
  refreshEnrollmentProgress,
  serializeEnrollmentForClient,
} = require("../utils/courseHelpers");
const { canAccessLesson } = require("../utils/courseAccess");

const COMPLETION_THRESHOLD = 0.9;

exports.updateLessonProgress = async (req, res) => {
  try {
    const { watchedSeconds, lastPosition, markComplete } = req.body;
    const lesson = await Lesson.findById(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const course = await Course.findById(lesson.courseId);
    if (!course) {
      return res.status(403).json({ message: "Course is no longer available" });
    }

    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: lesson.courseId,
      status: { $in: [ENROLLMENT_STATUS.ACTIVE, ENROLLMENT_STATUS.COMPLETED] },
    });

    if (!enrollment && !lesson.isPreview) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!enrollment) {
      return res
        .status(200)
        .json({ message: "Preview lesson — no progress saved" });
    }

    if (!canAccessLesson(req.user, lesson, enrollment)) {
      return res.status(403).json({ message: "Access denied" });
    }

    let progress = await LessonProgress.findOne({
      enrollmentId: enrollment._id,
      lessonId: lesson._id,
    });

    if (!progress) {
      progress = await LessonProgress.create({
        enrollmentId: enrollment._id,
        lessonId: lesson._id,
      });
    }

    if (watchedSeconds !== undefined) {
      progress.watchedSeconds = Math.max(
        progress.watchedSeconds || 0,
        Number(watchedSeconds) || 0,
      );
    }
    if (lastPosition !== undefined) {
      progress.lastPosition = Number(lastPosition) || 0;
    }

    const duration = lesson.video?.durationSeconds || 0;
    const shouldComplete =
      markComplete === true ||
      (lesson.type === "video" &&
        duration > 0 &&
        progress.watchedSeconds >= duration * COMPLETION_THRESHOLD) ||
      (lesson.type !== "video" && markComplete === true);

    if (shouldComplete && !progress.completed) {
      progress.completed = true;
      progress.completedAt = new Date();
    }

    await progress.save();

    await Enrollment.findByIdAndUpdate(enrollment._id, {
      lastLessonId: lesson._id,
      lastAccessedAt: new Date(),
    });

    const progressPercent = await recalculateEnrollmentProgress(enrollment._id);

    res.status(200).json({
      message: "Progress updated",
      lessonProgress: progress,
      enrollmentProgress: progressPercent,
    });
  } catch (error) {
    console.error("updateLessonProgress error:", error);
    res.status(500).json({ message: "Server error updating progress" });
  }
};

exports.getLessonProgress = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: req.params.courseId,
      status: {
        $in: [ENROLLMENT_STATUS.ACTIVE, ENROLLMENT_STATUS.COMPLETED],
      },
    });

    if (!enrollment) {
      return res.status(404).json({ message: "Not enrolled in this course" });
    }

    const refreshedEnrollment = await refreshEnrollmentProgress(enrollment);
    const progress = await LessonProgress.find({
      enrollmentId: refreshedEnrollment._id,
    });
    res.status(200).json({
      progress,
      enrollment: await serializeEnrollmentForClient(refreshedEnrollment),
    });
  } catch (error) {
    console.error("getLessonProgress error:", error);
    res.status(500).json({ message: "Server error fetching progress" });
  }
};
