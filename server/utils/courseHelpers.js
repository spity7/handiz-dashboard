const Course = require("../models/courseModel");
const CourseModule = require("../models/courseModuleModel");
const Lesson = require("../models/lessonModel");
const Enrollment = require("../models/enrollmentModel");
const LessonProgress = require("../models/lessonProgressModel");
const Certificate = require("../models/certificateModel");
const Quiz = require("../models/quizModel");
const QuizAttempt = require("../models/quizAttemptModel");
const Notification = require("../models/notificationModel");
const {
  ENROLLMENT_STATUS,
  ENROLLMENT_REVOKED_REASON,
} = require("../constants/enrollmentStatus");
const User = require("../models/userModel");
const { uploadCourseFile } = require("./gcs");
const {
  buildCertificatePdfBuffer,
  formatStudentName,
} = require("./certificatePdf");
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
const { buildLmsUrl } = require("./lmsUrls");
const { deleteImage } = require("./gcs");
const {
  deleteVideo: deleteVdocipherVideo,
  deleteFolder: deleteVdocipherFolder,
  createFolder,
  buildCourseFolderName,
} = require("./vdocipher");

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

const generateUniqueSlug = async (
  Model,
  base,
  excludeId = null,
  scope = null,
) => {
  let slug = slugify(base);
  if (!slug) slug = "course";
  let candidate = slug;
  let counter = 1;

  while (true) {
    const query = { slug: candidate };
    if (scope && typeof scope === "object") {
      Object.assign(query, scope);
    }
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await findSlugOwner(Model, query);
    if (!exists) return candidate;
    counter += 1;
    candidate = `${slug}-${counter}`;
  }
};

const entityBelongsToCourse = (entity, courseId) =>
  Boolean(entity && String(entity.courseId) === String(courseId));

const extractContentBlockImageUrls = (blocks) =>
  (blocks || [])
    .filter((block) => block.type === "image" && block.content)
    .map((block) => block.content);

const deleteGcsUrls = async (urls) => {
  const unique = [...new Set((urls || []).filter(Boolean))];
  await Promise.all(
    unique.map(async (url) => {
      try {
        await deleteImage(url);
      } catch (err) {
        console.warn("Failed to delete GCS file:", url, err.message);
      }
    }),
  );
};

const deleteRemovedContentBlockImages = async (oldBlocks, newBlocks) => {
  const oldUrls = extractContentBlockImageUrls(oldBlocks);
  const newUrls = extractContentBlockImageUrls(newBlocks);
  const toDelete = oldUrls.filter((url) => !newUrls.includes(url));
  await deleteGcsUrls(toDelete);
};

const deleteRemovedResourceUrls = async (oldResources, newResources) => {
  const oldUrls = (oldResources || [])
    .map((resource) => resource?.url)
    .filter(Boolean);
  const newUrls = (newResources || [])
    .map((resource) => resource?.url)
    .filter(Boolean);
  const toDelete = oldUrls.filter((url) => !newUrls.includes(url));
  await deleteGcsUrls(toDelete);
};

const deleteLessonContentBlockImages = async (lesson) => {
  await deleteGcsUrls(extractContentBlockImageUrls(lesson?.contentBlocks));
};

const collectLessonGcsUploadUrls = (lessonData) => {
  const urls = [
    ...extractContentBlockImageUrls(lessonData?.contentBlocks),
    ...(lessonData?.resources || [])
      .map((resource) => resource?.url)
      .filter(Boolean),
  ];
  return [...new Set(urls.filter(Boolean))];
};

const rollbackLessonGcsUploads = async ({ gcsUrls, vdoCipherVideoId }) => {
  await deleteGcsUrls(gcsUrls);
  if (vdoCipherVideoId) {
    try {
      await deleteVdocipherVideo(vdoCipherVideoId);
    } catch (err) {
      console.warn(
        "Failed to roll back VdoCipher video:",
        vdoCipherVideoId,
        err.message,
      );
    }
  }
};

const ensureCourseVdocipherFolder = async (course) => {
  if (course.vdoCipherFolderId) {
    return course.vdoCipherFolderId;
  }

  const folder = await createFolder(buildCourseFolderName(course));
  course.vdoCipherFolderId = folder.id;
  await course.save();
  return folder.id;
};

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
  await deleteLessonContentBlockImages(lesson);
};

const cleanupLessonQuizOnly = async (lessonId) => {
  const quiz = await Quiz.findOne({ lessonId });
  if (!quiz) return;
  await QuizAttempt.deleteMany({ quizId: quiz._id });
  await Quiz.deleteOne({ _id: quiz._id });
};

const cleanupLessonRelatedData = async (lessonId) => {
  await cleanupLessonQuizOnly(lessonId);
  await LessonProgress.deleteMany({ lessonId });
};

const removeLessonCompletely = async (lesson) => {
  await cleanupLessonMedia(lesson);
  await cleanupLessonRelatedData(lesson._id);
  await Lesson.deleteOne({ _id: lesson._id });
};

const revokeCourseEnrollments = async (courseId) => {
  const enrollments = await Enrollment.find({
    courseId,
    status: {
      $in: [ENROLLMENT_STATUS.ACTIVE, ENROLLMENT_STATUS.COMPLETED],
    },
  });

  if (enrollments.length === 0) return 0;

  await Promise.all(
    enrollments.map((enrollment) =>
      Enrollment.findByIdAndUpdate(enrollment._id, {
        status: ENROLLMENT_STATUS.REVOKED,
        revokedReason: ENROLLMENT_REVOKED_REASON.COURSE_ARCHIVE,
        statusBeforeRevoke: enrollment.status,
      }),
    ),
  );

  await Course.findByIdAndUpdate(courseId, {
    $inc: { enrollmentCount: -enrollments.length },
  });

  return enrollments.length;
};

const reactivateArchivedCourseEnrollments = async (courseId) => {
  const enrollments = await Enrollment.find({
    courseId,
    status: ENROLLMENT_STATUS.REVOKED,
    revokedReason: ENROLLMENT_REVOKED_REASON.COURSE_ARCHIVE,
  });

  if (enrollments.length === 0) return 0;

  await Promise.all(
    enrollments.map((enrollment) =>
      Enrollment.findByIdAndUpdate(enrollment._id, {
        status:
          enrollment.statusBeforeRevoke === ENROLLMENT_STATUS.COMPLETED
            ? ENROLLMENT_STATUS.COMPLETED
            : ENROLLMENT_STATUS.ACTIVE,
        revokedReason: null,
        statusBeforeRevoke: null,
      }),
    ),
  );

  await Course.findByIdAndUpdate(courseId, {
    $inc: { enrollmentCount: enrollments.length },
  });

  return enrollments.length;
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

  if (course.vdoCipherFolderId) {
    try {
      await deleteVdocipherFolder(course.vdoCipherFolderId);
    } catch (err) {
      console.warn(
        "Failed to delete VdoCipher folder:",
        course.vdoCipherFolderId,
        err.message,
      );
    }
  }

  await CourseModule.deleteMany({ courseId: course._id });
  await Quiz.deleteMany({ courseId: course._id });

  const enrollments = await Enrollment.find({ courseId: course._id }).select(
    "_id",
  );
  const enrollmentIds = enrollments.map((enrollment) => enrollment._id);

  if (enrollmentIds.length > 0) {
    await LessonProgress.deleteMany({ enrollmentId: { $in: enrollmentIds } });
    await QuizAttempt.deleteMany({ enrollmentId: { $in: enrollmentIds } });
  }

  await Certificate.deleteMany({ courseId: course._id });
  await Enrollment.deleteMany({ courseId: course._id });
  await Notification.deleteMany({ relatedCourseId: course._id });

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

  const course = await Course.findById(courseId).select("status");
  const updates = {
    lessonCount,
    totalDurationMinutes: Math.ceil(totalSeconds / 60),
  };

  const revertedToDraft =
    lessonCount === 0 && course?.status === COURSE_STATUS.PUBLISHED;

  if (revertedToDraft) {
    updates.status = COURSE_STATUS.DRAFT;
  }

  await Course.findByIdAndUpdate(courseId, updates);

  return {
    lessonCount,
    totalDurationMinutes: updates.totalDurationMinutes,
    revertedToDraft,
  };
};

const COURSE_REVERTED_TO_DRAFT_MESSAGE =
  "Course moved to Draft because it has no published lessons.";

const courseStatsSideEffects = (stats) =>
  stats?.revertedToDraft
    ? {
        courseRevertedToDraft: true,
        courseStatusMessage: COURSE_REVERTED_TO_DRAFT_MESSAGE,
      }
    : {};

const getPublishedLessonsForCourse = async (courseId) => {
  const [modules, lessons] = await Promise.all([
    CourseModule.find({ courseId }).sort({ order: 1 }),
    Lesson.find({ courseId, isPublished: true }).sort({ order: 1 }),
  ]);

  return modules.flatMap((mod) =>
    lessons.filter((lesson) => String(lesson.moduleId) === String(mod._id)),
  );
};

const buildSequentialLockMap = async (enrollment, courseId) => {
  const lockMap = new Map();
  if (!enrollment) return lockMap;

  const lessons = await getPublishedLessonsForCourse(courseId);
  if (lessons.length === 0) return lockMap;

  const completedIds = new Set(
    (
      await LessonProgress.find({
        enrollmentId: enrollment._id,
        completed: true,
        lessonId: { $in: lessons.map((lesson) => lesson._id) },
      }).select("lessonId")
    ).map((progress) => String(progress.lessonId)),
  );

  let priorLessonsComplete = true;
  for (const lesson of lessons) {
    if (!priorLessonsComplete && !lesson.isPreview) {
      lockMap.set(String(lesson._id), true);
    }
    if (!completedIds.has(String(lesson._id))) {
      priorLessonsComplete = false;
    }
  }

  return lockMap;
};

const isLessonSequentiallyLocked = async (enrollment, lesson, courseId) => {
  if (!enrollment || !lesson || lesson.isPreview) return false;
  const lockMap = await buildSequentialLockMap(enrollment, courseId);
  return lockMap.get(String(lesson._id)) === true;
};

const recalculateEnrollmentProgress = async (enrollmentId) => {
  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment) return null;

  const lessons = await getPublishedLessonsForCourse(enrollment.courseId);
  const totalLessons = lessons.length;

  if (totalLessons === 0) {
    const updates = { progressPercent: 0 };
    if (enrollment.status === ENROLLMENT_STATUS.COMPLETED) {
      updates.status = ENROLLMENT_STATUS.ACTIVE;
      updates.completedAt = null;
    }
    await Enrollment.findByIdAndUpdate(enrollmentId, updates);
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
  } else if (
    progressPercent < 100 &&
    enrollment.status === ENROLLMENT_STATUS.COMPLETED
  ) {
    updates.status = ENROLLMENT_STATUS.ACTIVE;
    updates.completedAt = null;
  }

  await Enrollment.findByIdAndUpdate(enrollmentId, updates);

  if (progressPercent === 100) {
    await issueCertificateIfNeeded(enrollment);
  }

  return progressPercent;
};

const recalculateAllEnrollmentsForCourse = async (courseId) => {
  const enrollments = await Enrollment.find({
    courseId,
    status: {
      $in: [ENROLLMENT_STATUS.ACTIVE, ENROLLMENT_STATUS.COMPLETED],
    },
  }).select("_id");

  await Promise.all(
    enrollments.map((enrollment) =>
      recalculateEnrollmentProgress(enrollment._id),
    ),
  );
};

const refreshEnrollmentProgress = async (enrollment) => {
  if (!enrollment) return null;
  if (
    ![ENROLLMENT_STATUS.ACTIVE, ENROLLMENT_STATUS.COMPLETED].includes(
      enrollment.status,
    )
  ) {
    return enrollment;
  }

  await recalculateEnrollmentProgress(enrollment._id);
  return Enrollment.findById(enrollment._id);
};

const getContinueLessonForEnrollment = async (enrollment) => {
  if (!enrollment) return null;

  const lessons = await getPublishedLessonsForCourse(enrollment.courseId);
  if (lessons.length === 0) return null;

  const completedIds = new Set(
    (
      await LessonProgress.find({
        enrollmentId: enrollment._id,
        completed: true,
        lessonId: { $in: lessons.map((lesson) => lesson._id) },
      }).select("lessonId")
    ).map((progress) => String(progress.lessonId)),
  );

  const firstIncomplete = lessons.find(
    (lesson) => !completedIds.has(String(lesson._id)),
  );

  return firstIncomplete || lessons[lessons.length - 1];
};

const serializeEnrollmentForClient = async (enrollment) => {
  if (!enrollment) return null;

  const obj = enrollment.toObject ? enrollment.toObject() : { ...enrollment };
  const continueLesson = await getContinueLessonForEnrollment(enrollment);
  obj.continueLessonSlug = continueLesson?.slug || null;
  return obj;
};

const generateCertificateNumber = () =>
  `HNDZ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const issueCertificateIfNeeded = async (enrollment) => {
  const existing = await Certificate.findOne({
    enrollmentId: enrollment._id,
  });
  if (existing?.pdfUrl) return existing;

  const [user, course] = await Promise.all([
    User.findById(enrollment.userId).select(
      "firstname lastname username email",
    ),
    Course.findById(enrollment.courseId).select("title slug"),
  ]);

  const certificate =
    existing ||
    (await Certificate.create({
      enrollmentId: enrollment._id,
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      certificateNumber: generateCertificateNumber(),
    }));

  if (!certificate.pdfUrl) {
    try {
      const pdfBuffer = await buildCertificatePdfBuffer({
        studentName: formatStudentName(user),
        courseTitle: course?.title || "Course",
        certificateNumber: certificate.certificateNumber,
        issuedAt: certificate.issuedAt || new Date(),
      });
      const pdfUrl = await uploadCourseFile(
        pdfBuffer,
        `certificate-${certificate.certificateNumber}.pdf`,
        "application/pdf",
        "certificates",
      );
      certificate.pdfUrl = pdfUrl;
      await certificate.save();
    } catch (error) {
      console.error("issueCertificateIfNeeded pdf error:", error.message);
    }
  }

  if (!existing) {
    await upsertUnreadNotification({
      recipientId: enrollment.userId,
      type: "course_completed",
      title: "Course completed!",
      message: `Congratulations! You completed "${course?.title || "your course"}".`,
      link: buildLmsUrl(`/my-courses?certificate=${enrollment._id}`),
      relatedCourseId: enrollment.courseId,
    });
  }

  return certificate;
};

const buildCurriculum = async (
  courseId,
  {
    includeUnpublished = false,
    hideEmptyModules = false,
    includeQuiz = false,
  } = {},
) => {
  const lessonFilter = { courseId };
  if (!includeUnpublished) lessonFilter.isPublished = true;

  const [modules, lessons] = await Promise.all([
    CourseModule.find({ courseId }).sort({ order: 1 }),
    Lesson.find(lessonFilter).sort({ order: 1 }),
  ]);

  let quizByLessonId = new Map();
  if (includeQuiz) {
    const quizLessons = lessons.filter((l) => l.type === "quiz");
    if (quizLessons.length > 0) {
      const quizzes = await Quiz.find({
        lessonId: { $in: quizLessons.map((l) => l._id) },
      });
      quizByLessonId = new Map(
        quizzes.map((q) => [String(q.lessonId), q.toObject()]),
      );
    }
  }

  const curriculum = modules.map((mod) => ({
    ...mod.toObject(),
    lessons: lessons
      .filter((l) => String(l.moduleId) === String(mod._id))
      .map((l) => {
        const lessonObj = l.toObject();
        if (lessonObj.type !== "video") {
          delete lessonObj.video;
        }
        if (includeQuiz && l.type === "quiz") {
          lessonObj.quiz = quizByLessonId.get(String(l._id)) || null;
        }
        return lessonObj;
      }),
  }));

  if (hideEmptyModules) {
    return curriculum.filter((mod) => (mod.lessons || []).length > 0);
  }

  return curriculum;
};

const validateCourseCanPublish = async (courseId) => {
  const publishedLessons = await Lesson.find({
    courseId,
    isPublished: true,
  });

  if (publishedLessons.length === 0) {
    return {
      ok: false,
      message:
        "Cannot publish: add at least one published lesson to the curriculum.",
    };
  }

  const pendingVideos = publishedLessons.filter(
    (lesson) =>
      lesson.type === "video" &&
      lesson.video?.vdoCipherVideoId &&
      lesson.video.encodingStatus !== "ready",
  );

  if (pendingVideos.length > 0) {
    const titles = pendingVideos.map((l) => `"${l.title}"`).join(", ");
    return {
      ok: false,
      message: `Cannot publish: video lesson(s) still processing: ${titles}.`,
    };
  }

  return { ok: true };
};

const stripLessonMediaIds = (obj) => {
  if (obj.video?.vdoCipherVideoId) {
    delete obj.video.vdoCipherVideoId;
  }
};

const filterStudentContentBlocks = (blocks) => {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.filter(
    (block) => block.type !== "file" && block.type !== "video",
  );
};

const sanitizeLessonForClient = (
  lesson,
  { hasAccess, isStaff: staff = false, sequentiallyLocked = false },
) => {
  const obj = lesson.toObject ? lesson.toObject() : { ...lesson };
  const keepResources = obj.type === "download";
  const blocked = !hasAccess || sequentiallyLocked;

  if (blocked) {
    delete obj.video;
    delete obj.resources;
    delete obj.contentBlocks;
    obj.locked = true;
    if (sequentiallyLocked && hasAccess) {
      obj.sequentiallyLocked = true;
    }
  } else {
    obj.locked = false;
    stripLessonMediaIds(obj);

    if (!staff) {
      if (!keepResources) {
        delete obj.resources;
      }
      obj.contentBlocks = filterStudentContentBlocks(obj.contentBlocks);
    }
  }
  return obj;
};

/**
 * Strip downloadable assets from lesson payload for student playback API.
 */
const sanitizeLessonPlayback = (lessonObj, { isStaff: staff = false } = {}) => {
  if (staff) return lessonObj;

  const keepResources = lessonObj.type === "download";
  if (!keepResources) {
    delete lessonObj.resources;
  }
  lessonObj.contentBlocks = filterStudentContentBlocks(lessonObj.contentBlocks);
  return lessonObj;
};

const notifyCourseEnrolled = async (userId, course) => {
  await upsertUnreadNotification({
    recipientId: userId,
    type: "course_enrolled",
    title: "Enrollment confirmed",
    message: `You are enrolled in "${course.title}".`,
    link: buildLmsUrl(`/courses/${course.slug}`),
    relatedCourseId: course._id,
  });
};

module.exports = {
  slugify,
  generateUniqueSlug,
  entityBelongsToCourse,
  deleteRemovedContentBlockImages,
  deleteRemovedResourceUrls,
  deleteLessonContentBlockImages,
  deleteLessonResourceFiles,
  collectLessonGcsUploadUrls,
  rollbackLessonGcsUploads,
  ensureCourseVdocipherFolder,
  cleanupLessonMedia,
  cleanupLessonQuizOnly,
  cleanupLessonRelatedData,
  removeLessonCompletely,
  revokeCourseEnrollments,
  reactivateArchivedCourseEnrollments,
  releaseCourseSlug,
  restoreOriginalCourseSlug,
  permanentlyDeleteCourseContent,
  recalculateCourseStats,
  courseStatsSideEffects,
  COURSE_REVERTED_TO_DRAFT_MESSAGE,
  getPublishedLessonsForCourse,
  buildSequentialLockMap,
  isLessonSequentiallyLocked,
  recalculateEnrollmentProgress,
  recalculateAllEnrollmentsForCourse,
  refreshEnrollmentProgress,
  getContinueLessonForEnrollment,
  serializeEnrollmentForClient,
  issueCertificateIfNeeded,
  buildCurriculum,
  validateCourseCanPublish,
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
