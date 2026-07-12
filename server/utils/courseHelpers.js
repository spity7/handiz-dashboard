const Course = require("../models/courseModel");
const CourseModule = require("../models/courseModuleModel");
const Lesson = require("../models/lessonModel");
const Enrollment = require("../models/enrollmentModel");
const LessonProgress = require("../models/lessonProgressModel");
const Certificate = require("../models/certificateModel");
const Quiz = require("../models/quizModel");
const QuizAttempt = require("../models/quizAttemptModel");
const { ENROLLMENT_STATUS } = require("../constants/enrollmentStatus");
const { COURSE_STATUS } = require("../constants/courseStatus");
const {
  normalizeCoursePricing,
  computeSalePrice,
  getCourseCheckoutAmount,
  hasActiveDiscount,
  hasFreeCompareAt,
  isEffectivelyFree,
  isFreeOfferExpired,
  serializeCourseForResponse,
} = require("./coursePricing");
const { upsertUnreadNotification } = require("./helpers/notificationService");
const { deleteImage, deleteGcsFile } = require("./gcs");
const { deleteVideo: deleteVdocipherVideo } = require("./vdocipher");

const slugify = (text) =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const findSlugOwner = async (Model, query) => {
  if (typeof Model.findOneWithDeleted === "function") {
    return Model.findOneWithDeleted(query).select("_id");
  }
  return Model.findOne(query).select("_id");
};

const generateUniqueSlug = async (Model, base, excludeId = null) => {
  let slug = slugify(base);
  if (!slug) slug = "course";
  let candidate = slug;
  let counter = 1;

  while (true) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await findSlugOwner(Model, query);
    if (!exists) return candidate;
    counter += 1;
    candidate = `${slug}-${counter}`;
  }
};

const entityBelongsToCourse = (entity, courseId) =>
  Boolean(entity && String(entity.courseId) === String(courseId));

const deleteLessonResourceFiles = async (lesson) => {
  const resources = lesson.resources || [];
  await Promise.all(
    resources.map(async (resource) => {
      if (!resource?.url) return;
      try {
        await deleteImage(resource.url);
      } catch (err) {
        console.warn(
          "Failed to delete lesson resource:",
          resource.url,
          err.message,
        );
      }
    }),
  );
};

const cleanupLessonMedia = async (lesson) => {
  if (lesson.video?.gcsPath) await deleteGcsFile(lesson.video.gcsPath);
  if (lesson.video?.vdoCipherVideoId) {
    try {
      await deleteVdocipherVideo(lesson.video.vdoCipherVideoId);
    } catch (err) {
      console.warn(
        "Failed to delete VdoCipher video:",
        lesson.video.vdoCipherVideoId,
        err.message,
      );
    }
  }
  if (lesson.video?.thumbnailUrl) {
    try {
      await deleteImage(lesson.video.thumbnailUrl);
    } catch (err) {
      console.warn("Failed to delete lesson thumbnail:", err.message);
    }
  }
  await deleteLessonResourceFiles(lesson);
};

const cleanupLessonRelatedData = async (lessonId) => {
  const quiz = await Quiz.findOne({ lessonId });
  if (quiz) {
    await QuizAttempt.deleteMany({ quizId: quiz._id });
    await Quiz.deleteOne({ _id: quiz._id });
  }
  await LessonProgress.deleteMany({ lessonId });
};

const removeLessonCompletely = async (lesson) => {
  await cleanupLessonMedia(lesson);
  await cleanupLessonRelatedData(lesson._id);
  await Lesson.deleteOne({ _id: lesson._id });
};

const revokeCourseEnrollments = async (courseId) => {
  const result = await Enrollment.updateMany(
    {
      courseId,
      status: {
        $in: [ENROLLMENT_STATUS.ACTIVE, ENROLLMENT_STATUS.COMPLETED],
      },
    },
    { $set: { status: ENROLLMENT_STATUS.REVOKED } },
  );
  return result.modifiedCount;
};

const releaseCourseSlug = (course) => {
  const suffix = `-deleted-${course._id.toString()}`;
  if (!course.slug.endsWith(suffix)) {
    course.slug = `${course.slug}${suffix}`;
  }
};

const restoreOriginalCourseSlug = async (course) => {
  const suffix = `-deleted-${course._id.toString()}`;
  let originalSlug = course.slug;
  if (originalSlug.endsWith(suffix)) {
    originalSlug = originalSlug.slice(0, -suffix.length);
  }
  course.slug = await generateUniqueSlug(Course, originalSlug, course._id);
};

const permanentlyDeleteCourseContent = async (course) => {
  const lessons = await Lesson.find({ courseId: course._id });
  for (const lesson of lessons) {
    await removeLessonCompletely(lesson);
  }
  await CourseModule.deleteMany({ courseId: course._id });
  await Quiz.deleteMany({ courseId: course._id });

  if (course.thumbnailUrl) {
    try {
      await deleteImage(course.thumbnailUrl);
    } catch (err) {
      console.warn(
        "Failed to delete course thumbnail:",
        course.thumbnailUrl,
        err.message,
      );
    }
  }
};

const recalculateCourseStats = async (courseId) => {
  const lessons = await Lesson.find({
    courseId,
    isPublished: true,
  }).select("video.durationSeconds");

  const lessonCount = lessons.length;
  const totalSeconds = lessons.reduce(
    (sum, l) => sum + (l.video?.durationSeconds || 0),
    0,
  );

  await Course.findByIdAndUpdate(courseId, {
    lessonCount,
    totalDurationMinutes: Math.ceil(totalSeconds / 60),
  });

  return { lessonCount, totalDurationMinutes: Math.ceil(totalSeconds / 60) };
};

const getPublishedLessonsForCourse = async (courseId) =>
  Lesson.find({ courseId, isPublished: true }).sort({ order: 1 });

const recalculateEnrollmentProgress = async (enrollmentId) => {
  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment) return null;

  const lessons = await getPublishedLessonsForCourse(enrollment.courseId);
  const totalLessons = lessons.length;

  if (totalLessons === 0) {
    await Enrollment.findByIdAndUpdate(enrollmentId, { progressPercent: 0 });
    return 0;
  }

  const completedCount = await LessonProgress.countDocuments({
    enrollmentId,
    completed: true,
    lessonId: { $in: lessons.map((l) => l._id) },
  });

  const progressPercent = Math.round((completedCount / totalLessons) * 100);
  const updates = { progressPercent };

  if (
    progressPercent === 100 &&
    enrollment.status !== ENROLLMENT_STATUS.COMPLETED
  ) {
    updates.status = ENROLLMENT_STATUS.COMPLETED;
    updates.completedAt = new Date();
  }

  await Enrollment.findByIdAndUpdate(enrollmentId, updates);

  if (progressPercent === 100) {
    await issueCertificateIfNeeded(enrollment);
  }

  return progressPercent;
};

const generateCertificateNumber = () =>
  `HNDZ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const issueCertificateIfNeeded = async (enrollment) => {
  const existing = await Certificate.findOne({
    enrollmentId: enrollment._id,
  });
  if (existing) return existing;

  const certificate = await Certificate.create({
    enrollmentId: enrollment._id,
    userId: enrollment.userId,
    courseId: enrollment.courseId,
    certificateNumber: generateCertificateNumber(),
  });

  const course = await Course.findById(enrollment.courseId).select(
    "title slug",
  );
  await upsertUnreadNotification({
    recipientId: enrollment.userId,
    type: "course_completed",
    title: "Course completed!",
    message: `Congratulations! You completed "${course?.title || "your course"}".`,
    link: `/my-courses`,
    relatedCourseId: enrollment.courseId,
  });

  return certificate;
};

const buildCurriculum = async (
  courseId,
  { includeUnpublished = false } = {},
) => {
  const lessonFilter = { courseId };
  if (!includeUnpublished) lessonFilter.isPublished = true;

  const [modules, lessons] = await Promise.all([
    CourseModule.find({ courseId }).sort({ order: 1 }),
    Lesson.find(lessonFilter).sort({ order: 1 }),
  ]);

  return modules.map((mod) => ({
    ...mod.toObject(),
    lessons: lessons
      .filter((l) => String(l.moduleId) === String(mod._id))
      .map((l) => l.toObject()),
  }));
};

const sanitizeLessonForClient = (
  lesson,
  { hasAccess, isStaff: staff = false },
) => {
  const obj = lesson.toObject ? lesson.toObject() : { ...lesson };
  if (!hasAccess) {
    delete obj.video;
    delete obj.resources;
    delete obj.contentBlocks;
    obj.locked = true;
  } else {
    obj.locked = false;
    if (obj.video?.gcsPath) {
      delete obj.video.gcsPath;
    }
    if (obj.video?.vdoCipherVideoId) {
      delete obj.video.vdoCipherVideoId;
    }

    if (!staff) {
      delete obj.resources;
      if (Array.isArray(obj.contentBlocks)) {
        obj.contentBlocks = obj.contentBlocks.filter(
          (block) => block.type !== "file" && block.type !== "video",
        );
      }
    }
  }
  return obj;
};

/**
 * Strip downloadable assets from lesson payload for student playback API.
 */
const sanitizeLessonPlayback = (lessonObj, { isStaff: staff = false }) => {
  if (staff) return lessonObj;

  delete lessonObj.resources;
  if (Array.isArray(lessonObj.contentBlocks)) {
    lessonObj.contentBlocks = lessonObj.contentBlocks.filter(
      (block) => block.type !== "file" && block.type !== "video",
    );
  }
  return lessonObj;
};

const notifyCourseEnrolled = async (userId, course) => {
  await upsertUnreadNotification({
    recipientId: userId,
    type: "course_enrolled",
    title: "Enrollment confirmed",
    message: `You are enrolled in "${course.title}".`,
    link: `/courses/${course.slug}/learn`,
    relatedCourseId: course._id,
  });
};

module.exports = {
  slugify,
  generateUniqueSlug,
  entityBelongsToCourse,
  cleanupLessonMedia,
  cleanupLessonRelatedData,
  removeLessonCompletely,
  revokeCourseEnrollments,
  releaseCourseSlug,
  restoreOriginalCourseSlug,
  permanentlyDeleteCourseContent,
  recalculateCourseStats,
  getPublishedLessonsForCourse,
  recalculateEnrollmentProgress,
  issueCertificateIfNeeded,
  buildCurriculum,
  sanitizeLessonForClient,
  sanitizeLessonPlayback,
  notifyCourseEnrolled,
  generateCertificateNumber,
  computeSalePrice,
  getCourseCheckoutAmount,
  hasActiveDiscount,
  hasFreeCompareAt,
  normalizeCoursePricing,
  serializeCourseForResponse,
  isEffectivelyFree,
  isFreeOfferExpired,
};
