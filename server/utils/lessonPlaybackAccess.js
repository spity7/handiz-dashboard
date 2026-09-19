const Course = require("../models/courseModel");
const Lesson = require("../models/lessonModel");
const Enrollment = require("../models/enrollmentModel");
const {
  isStaff,
  canAccessLesson,
  hasActiveEnrollment,
  getPublishedCourseFilter,
} = require("./courseAccess");
const {
  isLessonSequentiallyLocked,
  refreshEnrollmentProgress,
  usesSequentialLessonProgression,
} = require("./courseHelpers");

/**
 * Shared access checks for lesson playback (full lesson payload or OTP refresh).
 * Sends an HTTP response and returns null when access is denied.
 */
const resolveLessonPlaybackAccess = async (req, res) => {
  const courseFilter = { slug: req.params.slug };
  if (!isStaff(req.user)) {
    Object.assign(courseFilter, getPublishedCourseFilter());
  }

  const course = await Course.findOne(courseFilter);
  if (!course) {
    res.status(404).json({ message: "Course not found" });
    return null;
  }

  const lesson = await Lesson.findOne({
    courseId: course._id,
    slug: req.params.lessonSlug,
    ...(isStaff(req.user) ? {} : { isPublished: true }),
  });
  if (!lesson) {
    res.status(404).json({ message: "Lesson not found" });
    return null;
  }

  let enrollment = null;
  if (req.user) {
    enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: course._id,
    });
    if (enrollment) {
      enrollment = await refreshEnrollmentProgress(enrollment);
    }
  }

  const staff = isStaff(req.user);
  const hasAccess = canAccessLesson(req.user, lesson, enrollment);
  if (!hasAccess) {
    res.status(403).json({ message: "You do not have access to this lesson" });
    return null;
  }

  if (
    !staff &&
    enrollment &&
    usesSequentialLessonProgression(course) &&
    (await isLessonSequentiallyLocked(enrollment, lesson, course))
  ) {
    res.status(403).json({
      message: "Complete previous lessons before accessing this one",
      sequentiallyLocked: true,
    });
    return null;
  }

  if (
    !lesson.isPreview &&
    !staff &&
    enrollment &&
    hasActiveEnrollment(enrollment)
  ) {
    const { assertLessonDeviceAccess } = require("./lessonDeviceAccess");
    const deviceAllowed = await assertLessonDeviceAccess(req, res);
    if (!deviceAllowed) return null;
  }

  return { course, lesson, enrollment, staff };
};

module.exports = {
  resolveLessonPlaybackAccess,
};
