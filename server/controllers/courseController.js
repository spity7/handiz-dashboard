const {
  normalizeMarketingVideosInput,
} = require("../utils/courseMarketingVideos");
const {
  normalizeAboutCourseSectionsInput,
} = require("../utils/courseAboutSections");
const { INSTRUCTOR_PUBLIC_SELECT } = require("../utils/instructorPublicFields");
const Course = require("../models/courseModel");
const CourseModule = require("../models/courseModuleModel");
const Lesson = require("../models/lessonModel");
const Enrollment = require("../models/enrollmentModel");
const Quiz = require("../models/quizModel");
const {
  uploadCourseFile,
  uploadCourseThumbnail,
  uploadCourseHeroImage,
  deleteImage,
} = require("../utils/gcs");
const { COURSE_STATUS } = require("../constants/courseStatus");
const { ENROLLMENT_STATUS } = require("../constants/enrollmentStatus");
const {
  isStaff,
  canAccessLesson,
  hasActiveEnrollment,
  getPublishedCourseFilter,
  getPublicCatalogFilter,
} = require("../utils/courseAccess");
const {
  generateUniqueSlug,
  recalculateCourseStats,
  courseStatsSideEffects,
  buildCurriculum,
  sanitizeLessonForClient,
  sanitizeLessonPlayback,
  entityBelongsToCourse,
  removeLessonCompletely,
  cleanupLessonMedia,
  cleanupLessonQuizOnly,
  deleteRemovedContentBlockImages,
  deleteRemovedResourceUrls,
  deleteLessonContentBlockImages,
  deleteLessonResourceFiles,
  collectLessonGcsUploadUrls,
  rollbackLessonGcsUploads,
  ensureCourseVdocipherFolder,
  revokeCourseEnrollments,
  reactivateArchivedCourseEnrollments,
  releaseCourseSlug,
  restoreOriginalCourseSlug,
  permanentlyDeleteCourseContent,
  normalizeCoursePricing,
  serializeCourseForResponse,
  validateCourseCanPublish,
  buildSequentialLockMap,
  isLessonSequentiallyLocked,
  refreshEnrollmentProgress,
  serializeEnrollmentForClient,
  recalculateAllEnrollmentsForCourse,
  notifyCourseInstructorAssigned,
} = require("../utils/courseHelpers");
const {
  getPlaybackOtp,
  buildWatermarkAnnotate,
  deleteVideo: deleteVdocipherVideo,
} = require("../utils/vdocipher");
const { getImageValidationError } = require("../utils/imageValidation");

const parseJsonField = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeCourseStatus = (status) =>
  status && Object.values(COURSE_STATUS).includes(status)
    ? status
    : COURSE_STATUS.DRAFT;

const applyPublishMetadata = (course, previousStatus, nextStatus, userId) => {
  if (nextStatus !== COURSE_STATUS.PUBLISHED) return;
  if (previousStatus === COURSE_STATUS.PUBLISHED) return;

  const now = new Date();
  if (!course.publishedAt) {
    course.publishedAt = now;
    course.publishedBy = userId;
  }
  course.lastPublishedAt = now;
};

const resolveLessonContentBlocks = async (
  contentBlocksRaw,
  blockImageFiles,
) => {
  let blocks = parseJsonField(contentBlocksRaw, []) || [];
  if (!blocks.length) return [];

  if (blockImageFiles.length > 0) {
    const uploaded = await Promise.all(
      blockImageFiles.map((file) =>
        uploadCourseFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          "blocks",
        ),
      ),
    );
    blocks = blocks.map((block) => {
      if (
        block.type === "image" &&
        block.fileIndex !== undefined &&
        uploaded[block.fileIndex]
      ) {
        return { type: "image", content: uploaded[block.fileIndex] };
      }
      const { fileIndex, ...rest } = block;
      return rest;
    });
  } else {
    blocks = blocks.map((block) => {
      const { fileIndex, ...rest } = block;
      return rest;
    });
  }

  return blocks;
};

const lessonHasVideoSource = (lesson, { vdoCipherVideoId } = {}) =>
  Boolean(vdoCipherVideoId || lesson?.video?.vdoCipherVideoId);

const applyLessonTypeTransition = async (lesson, previousType, nextType) => {
  if (previousType === nextType) return;

  if (nextType !== "video" && previousType === "video") {
    await cleanupLessonMedia(lesson);
    lesson.video = {
      provider: "vdocipher",
      vdoCipherVideoId: "",
      encodingStatus: "pending",
      durationSeconds: 0,
      thumbnailUrl: "",
    };
  }

  if (nextType !== "text" && nextType !== "download") {
    await deleteLessonContentBlockImages(lesson);
    lesson.contentBlocks = [];
  }

  if (nextType !== "download") {
    await deleteLessonResourceFiles(lesson);
    lesson.resources = [];
  }

  if (nextType !== "quiz" && previousType === "quiz") {
    await cleanupLessonQuizOnly(lesson._id);
  }
};

const hasThumbnail = (thumbnailFile, thumbnailUrl) =>
  Boolean(thumbnailFile) || Boolean(String(thumbnailUrl || "").trim());

const hasCourseImage = hasThumbnail;

const uploadValidatedCourseImage = async (file, uploadFn) => {
  const validationError = getImageValidationError(file);
  if (validationError) {
    return { error: validationError };
  }

  const url = await uploadFn(file.buffer, file.originalname);
  return { url };
};

const applyOptionalHeroImageUpload = async ({
  course,
  file,
  variant,
  currentUrlKey,
}) => {
  if (!file) return null;

  const result = await uploadValidatedCourseImage(
    file,
    (buffer, originalName) =>
      uploadCourseHeroImage(buffer, originalName, variant),
  );
  if (result.error) return result;

  const previousUrl = course[currentUrlKey];
  if (previousUrl) await deleteImage(previousUrl);
  course[currentUrlKey] = result.url;
  return null;
};

exports.getCourses = async (req, res) => {
  try {
    const { tag, level, free, search, admin } = req.query;
    const isAdminList = admin === "true" && isStaff(req.user);
    const filter = isAdminList ? {} : getPublicCatalogFilter();

    if (tag) filter.tags = tag;
    if (level) filter.level = level;
    if (isAdminList) {
      if (free === "true") filter["pricing.isFree"] = true;
      if (free === "false") filter["pricing.isFree"] = false;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { excerpt: { $regex: search, $options: "i" } },
      ];
    }

    const query = isAdminList
      ? Course.findWithDeleted(filter)
      : Course.find(filter);
    let courses = await query
      .populate("instructorId", INSTRUCTOR_PUBLIC_SELECT)
      .sort({ order: 1, createdAt: -1 });

    courses = courses.map((course) =>
      serializeCourseForResponse(course, { forAdmin: isAdminList }),
    );

    if (!isAdminList && free === "true") {
      courses = courses.filter((course) => course.pricing?.isFree);
    }
    if (!isAdminList && free === "false") {
      courses = courses.filter((course) => !course.pricing?.isFree);
    }

    let enrollmentMap = new Map();
    if (req.user && !isAdminList) {
      const enrollments = await Enrollment.find({
        userId: req.user._id,
        status: {
          $in: [ENROLLMENT_STATUS.ACTIVE, ENROLLMENT_STATUS.COMPLETED],
        },
      }).select("courseId status progressPercent");
      enrollmentMap = new Map(
        enrollments.map((enrollment) => [
          String(enrollment.courseId),
          {
            isEnrolled: true,
            enrollmentStatus: enrollment.status,
            progressPercent: enrollment.progressPercent,
          },
        ]),
      );
    }

    const coursesWithEnrollment = courses.map((course) => {
      const enrollment = enrollmentMap.get(String(course._id));
      return {
        ...course,
        isEnrolled: Boolean(enrollment?.isEnrolled),
        enrollmentStatus: enrollment?.enrollmentStatus || null,
        progressPercent: enrollment?.progressPercent ?? null,
      };
    });

    res.status(200).json({ courses: coursesWithEnrollment });
  } catch (error) {
    console.error("getCourses error:", error);
    res.status(500).json({ message: "Server error fetching courses" });
  }
};

exports.getCourseAnalytics = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const enrollments = await Enrollment.find({ courseId: course._id });
    const completed = enrollments.filter(
      (e) => e.status === "completed",
    ).length;
    const active = enrollments.filter((e) => e.status === "active").length;
    const avgProgress =
      enrollments.length > 0
        ? Math.round(
            enrollments.reduce((s, e) => s + (e.progressPercent || 0), 0) /
              enrollments.length,
          )
        : 0;

    res.status(200).json({
      analytics: {
        totalEnrollments: enrollments.length,
        activeEnrollments: active,
        completedEnrollments: completed,
        completionRate:
          enrollments.length > 0
            ? Math.round((completed / enrollments.length) * 100)
            : 0,
        averageProgress: avgProgress,
        lessonCount: course.lessonCount,
        totalDurationMinutes: course.totalDurationMinutes,
      },
    });
  } catch (error) {
    console.error("getCourseAnalytics error:", error);
    res.status(500).json({ message: "Server error fetching analytics" });
  }
};

exports.getCourseBySlug = async (req, res) => {
  try {
    const filter = { slug: req.params.slug };
    if (!isStaff(req.user)) {
      Object.assign(filter, getPublishedCourseFilter());
    }

    const course = await Course.findOne(filter).populate(
      "instructorId",
      INSTRUCTOR_PUBLIC_SELECT,
    );
    if (!course) return res.status(404).json({ message: "Course not found" });

    const curriculum = await buildCurriculum(course._id, {
      includeUnpublished: isStaff(req.user),
      hideEmptyModules: !isStaff(req.user),
    });

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
    const sequentialLockMap =
      enrollment && !staff
        ? await buildSequentialLockMap(enrollment, course._id)
        : new Map();

    const sanitizedCurriculum = curriculum.map((mod) => ({
      ...mod,
      lessons: mod.lessons.map((lesson) => {
        const hasAccess = canAccessLesson(req.user, lesson, enrollment);
        const sequentiallyLocked =
          hasAccess && sequentialLockMap.get(String(lesson._id)) === true;
        return sanitizeLessonForClient(lesson, {
          hasAccess,
          isStaff: staff,
          sequentiallyLocked,
        });
      }),
    }));

    res.status(200).json({
      course: serializeCourseForResponse(course, { forAdmin: staff }),
      curriculum: sanitizedCurriculum,
      enrollment: await serializeEnrollmentForClient(enrollment),
      isEnrolled:
        !!enrollment && ["active", "completed"].includes(enrollment.status),
      isStaff: staff,
    });
  } catch (error) {
    console.error("getCourseBySlug error:", error);
    res.status(500).json({ message: "Server error fetching course" });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate(
      "instructorId",
      INSTRUCTOR_PUBLIC_SELECT,
    );
    if (!course) return res.status(404).json({ message: "Course not found" });

    const curriculum = await buildCurriculum(course._id, {
      includeUnpublished: true,
      includeQuiz: true,
    });

    res.status(200).json({
      course: serializeCourseForResponse(course, { forAdmin: true }),
      curriculum,
    });
  } catch (error) {
    console.error("getCourseById error:", error);
    res.status(500).json({ message: "Server error fetching course" });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const {
      title,
      excerpt,
      description,
      level,
      tags,
      heroHighlights,
      marketingVideos,
      aboutCourseSections,
      order,
      isFree,
      price,
      discountEnabled,
      discountType,
      discountValue,
      discountHasExpiry,
      discountEndsAt,
      freeHasExpiry,
      freeEndsAt,
      status,
      instructorId,
    } = req.body;
    const thumbnailFile = req.files?.thumbnail?.[0];
    const heroImageDesktopFile = req.files?.heroImageDesktop?.[0];
    const heroImageMobileFile = req.files?.heroImageMobile?.[0];

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (!thumbnailFile) {
      return res.status(400).json({ message: "Course thumbnail is required" });
    }

    if (!heroImageDesktopFile) {
      return res
        .status(400)
        .json({ message: "Desktop hero image is required" });
    }

    if (!heroImageMobileFile) {
      return res.status(400).json({ message: "Mobile hero image is required" });
    }

    const thumbnailTypeError = getImageValidationError(thumbnailFile);
    if (thumbnailTypeError) {
      return res.status(400).json({ message: thumbnailTypeError });
    }

    const slug = await generateUniqueSlug(Course, title);
    let thumbnailUrl = "";

    if (thumbnailFile) {
      thumbnailUrl = await uploadCourseThumbnail(
        thumbnailFile.buffer,
        thumbnailFile.originalname,
      );
    }

    let heroImageDesktopUrl = "";
    const heroDesktopResult = await uploadValidatedCourseImage(
      heroImageDesktopFile,
      (buffer, originalName) =>
        uploadCourseHeroImage(buffer, originalName, "desktop"),
    );
    if (heroDesktopResult.error) {
      return res.status(400).json({ message: heroDesktopResult.error });
    }
    heroImageDesktopUrl = heroDesktopResult.url;

    let heroImageMobileUrl = "";
    const heroMobileResult = await uploadValidatedCourseImage(
      heroImageMobileFile,
      (buffer, originalName) =>
        uploadCourseHeroImage(buffer, originalName, "mobile"),
    );
    if (heroMobileResult.error) {
      return res.status(400).json({ message: heroMobileResult.error });
    }
    heroImageMobileUrl = heroMobileResult.url;

    const resolvedStatus = normalizeCourseStatus(status);
    if (resolvedStatus === COURSE_STATUS.PUBLISHED) {
      return res.status(400).json({
        message:
          "Cannot publish a new course before adding curriculum. Save as draft, add lessons, then publish.",
      });
    }

    const publishedNow = new Date();

    const pricing = normalizeCoursePricing(
      isFree,
      price,
      {
        discountEnabled,
        discountType,
        discountValue,
        discountHasExpiry,
        discountEndsAt,
        freeHasExpiry,
        freeEndsAt,
      },
      { defaultIsFree: true },
    );
    if (pricing.error) {
      return res.status(400).json({ message: pricing.error });
    }

    const resolvedInstructorId = instructorId || req.user._id;

    let parsedMarketingVideos = [];
    if (marketingVideos !== undefined && marketingVideos !== "") {
      const marketingResult = normalizeMarketingVideosInput(marketingVideos);
      if (marketingResult.error) {
        return res.status(400).json({ message: marketingResult.error });
      }
      parsedMarketingVideos = marketingResult.videos;
    }

    let parsedAboutCourseSections = [];
    if (aboutCourseSections !== undefined && aboutCourseSections !== "") {
      const aboutResult =
        normalizeAboutCourseSectionsInput(aboutCourseSections);
      if (aboutResult.error) {
        return res.status(400).json({ message: aboutResult.error });
      }
      parsedAboutCourseSections = aboutResult.sections;
    }

    const course = await Course.create({
      title,
      slug,
      excerpt: excerpt || "",
      description: description || "",
      thumbnailUrl,
      heroImageDesktopUrl,
      heroImageMobileUrl,
      level,
      tags: parseJsonField(tags, []) || [],
      heroHighlights: parseJsonField(heroHighlights, []) || [],
      marketingVideos: parsedMarketingVideos,
      aboutCourseSections: parsedAboutCourseSections,
      order: order ? Number(order) : 999,
      status: resolvedStatus,
      pricing,
      instructorId: resolvedInstructorId,
      createdBy: req.user._id,
      ...(resolvedStatus === COURSE_STATUS.PUBLISHED
        ? {
            publishedAt: publishedNow,
            lastPublishedAt: publishedNow,
            publishedBy: req.user._id,
          }
        : {}),
    });

    try {
      await ensureCourseVdocipherFolder(course);
    } catch (folderError) {
      console.warn(
        "VdoCipher folder creation failed; will retry on video upload:",
        folderError.message,
      );
    }

    try {
      await notifyCourseInstructorAssigned(resolvedInstructorId, course, {
        assignedBy: req.user._id,
      });
    } catch (notifyError) {
      console.warn(
        "Instructor assignment notification failed:",
        notifyError.message,
      );
    }

    res.status(201).json({
      message: "Course created",
      course: serializeCourseForResponse(course, { forAdmin: true }),
    });
  } catch (error) {
    console.error("createCourse error:", error);
    res
      .status(500)
      .json({ message: "Server error creating course", error: error.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const {
      title,
      excerpt,
      description,
      level,
      tags,
      heroHighlights,
      marketingVideos,
      aboutCourseSections,
      order,
      isFree,
      price,
      discountEnabled,
      discountType,
      discountValue,
      discountHasExpiry,
      discountEndsAt,
      freeHasExpiry,
      freeEndsAt,
      slug,
      instructorId,
      status,
    } = req.body;
    const thumbnailFile = req.files?.thumbnail?.[0];
    const heroImageDesktopFile = req.files?.heroImageDesktop?.[0];
    const heroImageMobileFile = req.files?.heroImageMobile?.[0];

    if (title) {
      course.title = title;
    }
    if (excerpt !== undefined) course.excerpt = excerpt;
    if (description !== undefined) course.description = description;
    if (level) course.level = level;
    if (tags !== undefined)
      course.tags = parseJsonField(tags, course.tags) || [];
    if (heroHighlights !== undefined) {
      course.heroHighlights =
        parseJsonField(heroHighlights, course.heroHighlights) || [];
    }
    if (marketingVideos !== undefined) {
      const marketingResult = normalizeMarketingVideosInput(marketingVideos);
      if (marketingResult.error) {
        return res.status(400).json({ message: marketingResult.error });
      }
      course.marketingVideos = marketingResult.videos;
    }
    if (aboutCourseSections !== undefined) {
      const aboutResult =
        normalizeAboutCourseSectionsInput(aboutCourseSections);
      if (aboutResult.error) {
        return res.status(400).json({ message: aboutResult.error });
      }
      course.aboutCourseSections = aboutResult.sections;
    }
    if (order !== undefined) course.order = Number(order);

    const previousInstructorId = course.instructorId
      ? String(course.instructorId)
      : null;
    if (instructorId) course.instructorId = instructorId;

    if (
      isFree !== undefined ||
      price !== undefined ||
      discountEnabled !== undefined ||
      discountType !== undefined ||
      discountValue !== undefined ||
      discountHasExpiry !== undefined ||
      discountEndsAt !== undefined ||
      freeHasExpiry !== undefined ||
      freeEndsAt !== undefined
    ) {
      const pricing = normalizeCoursePricing(
        isFree !== undefined ? isFree : course.pricing?.isFree,
        price !== undefined ? price : course.pricing?.price,
        {
          discountEnabled:
            discountEnabled !== undefined
              ? discountEnabled
              : course.pricing?.discount?.enabled,
          discountType:
            discountType !== undefined
              ? discountType
              : course.pricing?.discount?.type,
          discountValue:
            discountValue !== undefined
              ? discountValue
              : course.pricing?.discount?.value,
          discountHasExpiry:
            discountHasExpiry !== undefined
              ? discountHasExpiry
              : Boolean(course.pricing?.discount?.endsAt),
          discountEndsAt:
            discountEndsAt !== undefined
              ? discountEndsAt
              : course.pricing?.discount?.endsAt,
          freeHasExpiry:
            freeHasExpiry !== undefined
              ? freeHasExpiry
              : Boolean(course.pricing?.freeEndsAt),
          freeEndsAt:
            freeEndsAt !== undefined ? freeEndsAt : course.pricing?.freeEndsAt,
        },
        { defaultIsFree: course.pricing?.isFree ?? true },
      );
      if (pricing.error) {
        return res.status(400).json({ message: pricing.error });
      }
      course.pricing = pricing;
    }

    if (status !== undefined) {
      const resolvedStatus = normalizeCourseStatus(status);
      const previousStatus = course.status;

      if (resolvedStatus === COURSE_STATUS.PUBLISHED) {
        const publishCheck = await validateCourseCanPublish(course._id);
        if (!publishCheck.ok) {
          return res.status(400).json({ message: publishCheck.message });
        }
      }

      course.status = resolvedStatus;
      applyPublishMetadata(
        course,
        previousStatus,
        resolvedStatus,
        req.user._id,
      );
    }

    if (thumbnailFile) {
      const thumbnailTypeError = getImageValidationError(thumbnailFile);
      if (thumbnailTypeError) {
        return res.status(400).json({ message: thumbnailTypeError });
      }

      if (course.thumbnailUrl) await deleteImage(course.thumbnailUrl);
      course.thumbnailUrl = await uploadCourseThumbnail(
        thumbnailFile.buffer,
        thumbnailFile.originalname,
      );
    }

    const heroDesktopError = await applyOptionalHeroImageUpload({
      course,
      file: heroImageDesktopFile,
      variant: "desktop",
      currentUrlKey: "heroImageDesktopUrl",
    });
    if (heroDesktopError?.error) {
      return res.status(400).json({ message: heroDesktopError.error });
    }

    const heroMobileError = await applyOptionalHeroImageUpload({
      course,
      file: heroImageMobileFile,
      variant: "mobile",
      currentUrlKey: "heroImageMobileUrl",
    });
    if (heroMobileError?.error) {
      return res.status(400).json({ message: heroMobileError.error });
    }

    if (!hasThumbnail(thumbnailFile, course.thumbnailUrl)) {
      return res.status(400).json({ message: "Course thumbnail is required" });
    }

    if (!hasCourseImage(heroImageDesktopFile, course.heroImageDesktopUrl)) {
      return res
        .status(400)
        .json({ message: "Desktop hero image is required" });
    }

    if (!hasCourseImage(heroImageMobileFile, course.heroImageMobileUrl)) {
      return res.status(400).json({ message: "Mobile hero image is required" });
    }

    await course.save();

    if (instructorId && String(instructorId) !== previousInstructorId) {
      try {
        await notifyCourseInstructorAssigned(instructorId, course, {
          assignedBy: req.user._id,
        });
      } catch (notifyError) {
        console.warn(
          "Instructor assignment notification failed:",
          notifyError.message,
        );
      }
    }

    res.status(200).json({
      message: "Course updated",
      course: serializeCourseForResponse(course, { forAdmin: true }),
    });
  } catch (error) {
    console.error("updateCourse error:", error);
    res
      .status(500)
      .json({ message: "Server error updating course", error: error.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const revokedEnrollments = await revokeCourseEnrollments(course._id);

    course.status = COURSE_STATUS.ARCHIVED;
    releaseCourseSlug(course);
    await course.softDelete();

    res.status(200).json({
      message: "Course removed from catalog",
      revokedEnrollments,
    });
  } catch (error) {
    console.error("deleteCourse error:", error);
    res.status(500).json({ message: "Server error deleting course" });
  }
};

exports.restoreCourse = async (req, res) => {
  try {
    if (!isStaff(req.user)) {
      return res
        .status(403)
        .json({ message: "Forbidden: cannot restore course" });
    }

    const course = await Course.findOneWithDeleted({ _id: req.params.id });
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!course.deletedAt) {
      return res
        .status(400)
        .json({ message: "Course is not removed from catalog" });
    }

    await restoreOriginalCourseSlug(course);
    await course.restore();

    const reactivatedEnrollments = await reactivateArchivedCourseEnrollments(
      course._id,
    );

    res.status(200).json({
      message:
        "Course restored. Publish it separately to make it public. Enrollments revoked during archive were reactivated.",
      course,
      reactivatedEnrollments,
    });
  } catch (error) {
    console.error("restoreCourse error:", error);
    res.status(500).json({ message: "Server error restoring course" });
  }
};

exports.permanentlyDeleteCourse = async (req, res) => {
  try {
    if (!isStaff(req.user)) {
      return res
        .status(403)
        .json({ message: "Forbidden: cannot permanently delete course" });
    }

    const course = await Course.findOneWithDeleted({ _id: req.params.id });
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!course.deletedAt) {
      return res.status(400).json({
        message:
          "Course must be removed from catalog before permanent deletion",
      });
    }

    await permanentlyDeleteCourseContent(course);
    await Course.deleteOne({ _id: course._id });

    res.status(200).json({ message: "Course permanently deleted" });
  } catch (error) {
    console.error("permanentlyDeleteCourse error:", error);
    res
      .status(500)
      .json({ message: "Server error permanently deleting course" });
  }
};

exports.createModule = async (req, res) => {
  try {
    const { title, description, order } = req.body;
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!title) return res.status(400).json({ message: "Title is required" });

    const module = await CourseModule.create({
      courseId: course._id,
      title,
      description: description || "",
      order: order !== undefined ? Number(order) : 0,
    });

    res.status(201).json({ message: "Module created", module });
  } catch (error) {
    console.error("createModule error:", error);
    res.status(500).json({ message: "Server error creating module" });
  }
};

exports.updateModule = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const module = await CourseModule.findById(req.params.moduleId);
    if (!module || !entityBelongsToCourse(module, course._id)) {
      return res.status(404).json({ message: "Module not found" });
    }

    const { title, description, order } = req.body;
    if (title) module.title = title;
    if (description !== undefined) module.description = description;
    if (order !== undefined) module.order = Number(order);
    await module.save();

    res.status(200).json({ message: "Module updated", module });
  } catch (error) {
    console.error("updateModule error:", error);
    res.status(500).json({ message: "Server error updating module" });
  }
};

exports.deleteModule = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const module = await CourseModule.findById(req.params.moduleId);
    if (!module || !entityBelongsToCourse(module, course._id)) {
      return res.status(404).json({ message: "Module not found" });
    }

    const lessons = await Lesson.find({ moduleId: module._id });
    for (const lesson of lessons) {
      await removeLessonCompletely(lesson);
    }
    await module.deleteOne();
    const stats = await recalculateCourseStats(course._id);
    await recalculateAllEnrollmentsForCourse(course._id);

    res.status(200).json({
      message: "Module deleted",
      ...courseStatsSideEffects(stats),
    });
  } catch (error) {
    console.error("deleteModule error:", error);
    res.status(500).json({ message: "Server error deleting module" });
  }
};

exports.createLesson = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const {
      moduleId,
      title,
      type,
      order,
      isPreview,
      isPublished,
      contentBlocks,
      resources,
      durationSeconds,
      vdoCipherVideoId,
    } = req.body;
    const resourceFiles = req.files?.resources || [];
    const blockImageFiles = req.files?.blockImages || [];

    if (!moduleId || !title) {
      return res
        .status(400)
        .json({ message: "moduleId and title are required" });
    }

    const module = await CourseModule.findById(moduleId);
    if (!module || String(module.courseId) !== String(course._id)) {
      return res.status(400).json({ message: "Invalid module" });
    }

    const lessonType = type || "video";
    if (
      lessonType === "video" &&
      !lessonHasVideoSource(null, { vdoCipherVideoId })
    ) {
      return res
        .status(400)
        .json({ message: "A video file is required for video lessons." });
    }

    const lessonCount = await Lesson.countDocuments({ moduleId });
    const resolvedOrder =
      order !== undefined && order !== "" ? Number(order) : lessonCount;

    const slug = await generateUniqueSlug(Lesson, title, null, {
      courseId: course._id,
    });
    const lessonData = {
      courseId: course._id,
      moduleId,
      title,
      slug,
      type: lessonType,
      order: resolvedOrder,
      isPreview: isPreview === "true" || isPreview === true,
      isPublished: isPublished !== "false" && isPublished !== false,
      contentBlocks: [],
      resources: parseJsonField(resources, []) || [],
      video: {
        provider: "vdocipher",
        durationSeconds: Number(durationSeconds) || 0,
        encodingStatus: "pending",
      },
    };

    if (lessonType === "text" || lessonType === "download") {
      lessonData.contentBlocks = await resolveLessonContentBlocks(
        contentBlocks,
        blockImageFiles,
      );
    }

    if (vdoCipherVideoId) {
      lessonData.video.vdoCipherVideoId = vdoCipherVideoId;
      lessonData.video.encodingStatus = "processing";
      lessonData.video.provider = "vdocipher";
    }

    if (lessonType === "download" && resourceFiles.length > 0) {
      const uploaded = await Promise.all(
        resourceFiles.map((file) =>
          uploadCourseFile(file.buffer, file.originalname, file.mimetype),
        ),
      );
      lessonData.resources = [
        ...lessonData.resources,
        ...uploaded.map((url, i) => ({
          title: resourceFiles[i].originalname,
          url,
          fileType: resourceFiles[i].mimetype,
        })),
      ];
    }

    let lesson;
    const rollbackUploads = {
      gcsUrls: collectLessonGcsUploadUrls(lessonData),
      vdoCipherVideoId: lessonData.video?.vdoCipherVideoId || null,
    };

    try {
      lesson = await Lesson.create(lessonData);
    } catch (createError) {
      await rollbackLessonGcsUploads(rollbackUploads);
      throw createError;
    }
    await recalculateCourseStats(course._id);
    await recalculateAllEnrollmentsForCourse(course._id);

    res.status(201).json({ message: "Lesson created", lesson });
  } catch (error) {
    console.error("createLesson error:", error);
    res
      .status(500)
      .json({ message: "Server error creating lesson", error: error.message });
  }
};

exports.updateLesson = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const lesson = await Lesson.findById(req.params.lessonId);
    if (!lesson || !entityBelongsToCourse(lesson, course._id)) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const {
      title,
      type,
      order,
      isPreview,
      isPublished,
      contentBlocks,
      resources,
      durationSeconds,
      moduleId,
      vdoCipherVideoId,
    } = req.body;
    const resourceFiles = req.files?.resources || [];
    const blockImageFiles = req.files?.blockImages || [];
    const previousType = lesson.type;

    if (title) {
      lesson.title = title;
      lesson.slug = await generateUniqueSlug(Lesson, title, lesson._id, {
        courseId: course._id,
      });
    }

    const nextType = type || lesson.type;
    if (type) lesson.type = nextType;

    if (order !== undefined && order !== "") lesson.order = Number(order);
    if (isPreview !== undefined)
      lesson.isPreview = isPreview === "true" || isPreview === true;
    if (isPublished !== undefined)
      lesson.isPublished = isPublished !== "false" && isPublished !== false;

    if (moduleId) {
      const targetModule = await CourseModule.findById(moduleId);
      if (!targetModule || !entityBelongsToCourse(targetModule, course._id)) {
        return res.status(400).json({ message: "Invalid module" });
      }
      lesson.moduleId = moduleId;
    }

    await applyLessonTypeTransition(lesson, previousType, nextType);

    if (nextType === "text" || nextType === "download") {
      if (contentBlocks !== undefined) {
        const newBlocks = await resolveLessonContentBlocks(
          contentBlocks,
          blockImageFiles,
        );
        await deleteRemovedContentBlockImages(lesson.contentBlocks, newBlocks);
        lesson.contentBlocks = newBlocks;
      }
    }

    if (nextType === "download") {
      if (resources !== undefined) {
        const newResources = parseJsonField(resources, []) || [];
        await deleteRemovedResourceUrls(lesson.resources, newResources);
        lesson.resources = newResources;
      }
      if (resourceFiles.length > 0) {
        const uploaded = await Promise.all(
          resourceFiles.map((file) =>
            uploadCourseFile(file.buffer, file.originalname, file.mimetype),
          ),
        );
        lesson.resources = [
          ...(lesson.resources || []),
          ...uploaded.map((url, i) => ({
            title: resourceFiles[i].originalname,
            url,
            fileType: resourceFiles[i].mimetype,
          })),
        ];
      }
    }

    if (nextType === "video") {
      if (!lessonHasVideoSource(lesson, { vdoCipherVideoId })) {
        return res.status(400).json({
          message:
            "This video lesson has no video. Upload a video file before saving.",
        });
      }
      if (durationSeconds !== undefined) {
        lesson.video = lesson.video || {};
        lesson.video.durationSeconds = Number(durationSeconds) || 0;
      }
    }

    if (
      vdoCipherVideoId &&
      vdoCipherVideoId !== lesson.video?.vdoCipherVideoId
    ) {
      if (lesson.video?.vdoCipherVideoId) {
        await deleteVdocipherVideo(lesson.video.vdoCipherVideoId);
      }
      lesson.video = lesson.video || {};
      lesson.video.vdoCipherVideoId = vdoCipherVideoId;
      lesson.video.provider = "vdocipher";
      lesson.video.encodingStatus = "processing";
    }

    await lesson.save();
    const stats = await recalculateCourseStats(lesson.courseId);
    await recalculateAllEnrollmentsForCourse(course._id);

    res.status(200).json({
      message: "Lesson updated",
      lesson,
      ...courseStatsSideEffects(stats),
    });
  } catch (error) {
    console.error("updateLesson error:", error);
    res
      .status(500)
      .json({ message: "Server error updating lesson", error: error.message });
  }
};

exports.deleteLesson = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const lesson = await Lesson.findById(req.params.lessonId);
    if (!lesson || !entityBelongsToCourse(lesson, course._id)) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const courseId = lesson.courseId;
    await removeLessonCompletely(lesson);
    const stats = await recalculateCourseStats(courseId);
    await recalculateAllEnrollmentsForCourse(courseId);

    res.status(200).json({
      message: "Lesson deleted",
      ...courseStatsSideEffects(stats),
    });
  } catch (error) {
    console.error("deleteLesson error:", error);
    res.status(500).json({ message: "Server error deleting lesson" });
  }
};

exports.reorderCurriculum = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const { modules } = req.body;
    if (!Array.isArray(modules)) {
      return res.status(400).json({ message: "modules array is required" });
    }

    for (const mod of modules) {
      if (mod._id) {
        const courseModule = await CourseModule.findById(mod._id);
        if (!courseModule || !entityBelongsToCourse(courseModule, course._id)) {
          return res.status(400).json({
            message: `Invalid module in reorder payload: ${mod._id}`,
          });
        }
        await CourseModule.findByIdAndUpdate(mod._id, { order: mod.order });
      }
      if (Array.isArray(mod.lessons)) {
        for (const lesson of mod.lessons) {
          if (lesson._id) {
            const existingLesson = await Lesson.findById(lesson._id);
            if (
              !existingLesson ||
              !entityBelongsToCourse(existingLesson, course._id)
            ) {
              return res.status(400).json({
                message: `Invalid lesson in reorder payload: ${lesson._id}`,
              });
            }
            await Lesson.findByIdAndUpdate(lesson._id, {
              order: lesson.order,
              moduleId: mod._id,
            });
          }
        }
      }
    }

    const curriculum = await buildCurriculum(req.params.id, {
      includeUnpublished: true,
    });

    res.status(200).json({ message: "Curriculum reordered", curriculum });
  } catch (error) {
    console.error("reorderCurriculum error:", error);
    res.status(500).json({ message: "Server error reordering curriculum" });
  }
};

exports.getLessonBySlug = async (req, res) => {
  try {
    const courseFilter = { slug: req.params.slug };
    if (!isStaff(req.user))
      Object.assign(courseFilter, getPublishedCourseFilter());

    const course = await Course.findOne(courseFilter);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const lesson = await Lesson.findOne({
      courseId: course._id,
      slug: req.params.lessonSlug,
      ...(isStaff(req.user) ? {} : { isPublished: true }),
    });
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

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
      return res
        .status(403)
        .json({ message: "You do not have access to this lesson" });
    }

    if (
      !staff &&
      enrollment &&
      (await isLessonSequentiallyLocked(enrollment, lesson, course._id))
    ) {
      return res.status(403).json({
        message: "Complete previous lessons before accessing this one",
        sequentiallyLocked: true,
      });
    }

    if (
      !lesson.isPreview &&
      !staff &&
      enrollment &&
      hasActiveEnrollment(enrollment)
    ) {
      const {
        assertLessonDeviceAccess,
      } = require("../utils/lessonDeviceAccess");
      const deviceAllowed = await assertLessonDeviceAccess(req, res);
      if (!deviceAllowed) return;
    }

    const lessonObj = lesson.toObject();
    let playback = null;

    if (lesson.type === "video") {
      if (!lesson.video?.vdoCipherVideoId) {
        return res
          .status(404)
          .json({ message: "Video not found for this lesson." });
      }

      if (lesson.video.encodingStatus !== "ready") {
        return res.status(409).json({
          message: "Video is still processing. Please check back shortly.",
          encodingStatus: lesson.video.encodingStatus,
        });
      }

      playback = await getPlaybackOtp(lesson.video.vdoCipherVideoId, {
        annotate: buildWatermarkAnnotate(req.user),
      });
      delete lessonObj.video.vdoCipherVideoId;
    }

    sanitizeLessonPlayback(lessonObj, { isStaff: staff });

    let quiz = null;
    if (lesson.type === "quiz") {
      quiz = await Quiz.findOne({ lessonId: lesson._id }).select(
        "-questions.correctIndex",
      );
    }

    if (enrollment) {
      await Enrollment.findByIdAndUpdate(enrollment._id, {
        lastLessonId: lesson._id,
        lastAccessedAt: new Date(),
      });
    }

    res.status(200).json({
      course: { _id: course._id, title: course.title, slug: course.slug },
      lesson: lessonObj,
      playback,
      quiz,
      enrollment: await serializeEnrollmentForClient(enrollment),
    });
  } catch (error) {
    console.error("getLessonBySlug error:", error);
    res.status(500).json({ message: "Server error fetching lesson" });
  }
};

exports.upsertQuiz = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const lesson = await Lesson.findById(req.params.lessonId);
    if (!lesson || !entityBelongsToCourse(lesson, course._id)) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const { passingScore, questions } = req.body;
    const parsedQuestions = parseJsonField(questions, []) || [];
    if (!parsedQuestions.length) {
      return res
        .status(400)
        .json({ message: "Quiz must have at least one question." });
    }

    const normalizedPassingScore = (() => {
      const num = Number(passingScore);
      if (Number.isNaN(num)) return 70;
      return Math.min(100, Math.max(1, num));
    })();

    const quiz = await Quiz.findOneAndUpdate(
      { lessonId: lesson._id },
      {
        lessonId: lesson._id,
        courseId: lesson.courseId,
        passingScore: normalizedPassingScore,
        questions: parsedQuestions,
      },
      { upsert: true, new: true },
    );

    res.status(200).json({ message: "Quiz saved", quiz });
  } catch (error) {
    console.error("upsertQuiz error:", error);
    res.status(500).json({ message: "Server error saving quiz" });
  }
};
