const Course = require("../models/courseModel");
const CourseModule = require("../models/courseModuleModel");
const Lesson = require("../models/lessonModel");
const Enrollment = require("../models/enrollmentModel");
const Quiz = require("../models/quizModel");
const {
  uploadImage,
  uploadVideo,
  uploadCourseFile,
  deleteImage,
  deleteGcsFile,
  getSignedVideoUrl,
} = require("../utils/gcs");
const { COURSE_STATUS } = require("../constants/courseStatus");
const {
  isStaff,
  canAccessLesson,
  getPublishedCourseFilter,
} = require("../utils/courseAccess");
const {
  generateUniqueSlug,
  recalculateCourseStats,
  buildCurriculum,
  sanitizeLessonForClient,
  sanitizeLessonPlayback,
  entityBelongsToCourse,
  removeLessonCompletely,
  revokeCourseEnrollments,
  releaseCourseSlug,
  restoreOriginalCourseSlug,
  permanentlyDeleteCourseContent,
  normalizeCoursePricing,
  serializeCourseForResponse,
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

const hasThumbnail = (thumbnailFile, thumbnailUrl) =>
  Boolean(thumbnailFile) || Boolean(String(thumbnailUrl || "").trim());

exports.getCourses = async (req, res) => {
  try {
    const { tag, level, free, search, admin } = req.query;
    const isAdminList = admin === "true" && isStaff(req.user);
    const filter = isAdminList ? {} : getPublishedCourseFilter();

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
      .populate("instructorId", "firstname lastname email username")
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

    res.status(200).json({ courses });
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
      "firstname lastname email username",
    );
    if (!course) return res.status(404).json({ message: "Course not found" });

    const curriculum = await buildCurriculum(course._id, {
      includeUnpublished: isStaff(req.user),
    });

    let enrollment = null;
    if (req.user) {
      enrollment = await Enrollment.findOne({
        userId: req.user._id,
        courseId: course._id,
      });
    }

    const staff = isStaff(req.user);
    const sanitizedCurriculum = curriculum.map((mod) => ({
      ...mod,
      lessons: mod.lessons.map((lesson) => {
        const hasAccess = canAccessLesson(req.user, lesson, enrollment);
        return sanitizeLessonForClient(lesson, { hasAccess, isStaff: staff });
      }),
    }));

    res.status(200).json({
      course: serializeCourseForResponse(course, { forAdmin: staff }),
      curriculum: sanitizedCurriculum,
      enrollment,
      isEnrolled:
        !!enrollment && ["active", "completed"].includes(enrollment.status),
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
      "firstname lastname email username",
    );
    if (!course) return res.status(404).json({ message: "Course not found" });

    const curriculum = await buildCurriculum(course._id, {
      includeUnpublished: true,
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

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (!thumbnailFile) {
      return res.status(400).json({ message: "Course thumbnail is required" });
    }

    const thumbnailTypeError = getImageValidationError(thumbnailFile);
    if (thumbnailTypeError) {
      return res.status(400).json({ message: thumbnailTypeError });
    }

    const slug = await generateUniqueSlug(Course, title);
    let thumbnailUrl = "";

    if (thumbnailFile) {
      const fileName = `courses/thumbnails/${Date.now()}_${thumbnailFile.originalname}`;
      thumbnailUrl = await uploadImage(
        thumbnailFile.buffer,
        fileName,
        thumbnailFile.mimetype,
      );
    }

    const resolvedStatus = normalizeCourseStatus(status);
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

    const course = await Course.create({
      title,
      slug,
      excerpt: excerpt || "",
      description: description || "",
      thumbnailUrl,
      level,
      tags: parseJsonField(tags, []) || [],
      order: order ? Number(order) : 999,
      status: resolvedStatus,
      pricing,
      instructorId: instructorId || req.user._id,
      createdBy: req.user._id,
      ...(resolvedStatus === COURSE_STATUS.PUBLISHED
        ? {
            publishedAt: publishedNow,
            lastPublishedAt: publishedNow,
            publishedBy: req.user._id,
          }
        : {}),
    });

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
      instructorId,
      status,
    } = req.body;
    const thumbnailFile = req.files?.thumbnail?.[0];

    if (title) {
      const previousTitle = course.title;
      course.title = title;
      if (title !== previousTitle) {
        course.slug = await generateUniqueSlug(Course, title, course._id);
      }
    }
    if (excerpt !== undefined) course.excerpt = excerpt;
    if (description !== undefined) course.description = description;
    if (level) course.level = level;
    if (tags !== undefined)
      course.tags = parseJsonField(tags, course.tags) || [];
    if (order !== undefined) course.order = Number(order);
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
      const fileName = `courses/thumbnails/${Date.now()}_${thumbnailFile.originalname}`;
      course.thumbnailUrl = await uploadImage(
        thumbnailFile.buffer,
        fileName,
        thumbnailFile.mimetype,
      );
    }

    if (!hasThumbnail(thumbnailFile, course.thumbnailUrl)) {
      return res.status(400).json({ message: "Course thumbnail is required" });
    }

    await course.save();
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

    res.status(200).json({
      message:
        "Course restored. Publish it separately to make it public. Previous enrollments remain revoked.",
      course,
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
    await recalculateCourseStats(course._id);

    res.status(200).json({ message: "Module deleted" });
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
    const videoFile = req.files?.video?.[0];
    const resourceFiles = req.files?.resources || [];

    if (!moduleId || !title) {
      return res
        .status(400)
        .json({ message: "moduleId and title are required" });
    }

    const module = await CourseModule.findById(moduleId);
    if (!module || String(module.courseId) !== String(course._id)) {
      return res.status(400).json({ message: "Invalid module" });
    }

    const slug = await generateUniqueSlug(Lesson, title);
    const lessonData = {
      courseId: course._id,
      moduleId,
      title,
      slug,
      type: type || "video",
      order: order !== undefined ? Number(order) : 0,
      isPreview: isPreview === "true" || isPreview === true,
      isPublished: isPublished !== "false" && isPublished !== false,
      contentBlocks: parseJsonField(contentBlocks, []) || [],
      resources: parseJsonField(resources, []) || [],
      video: {
        provider: "vdocipher",
        durationSeconds: Number(durationSeconds) || 0,
        encodingStatus: "pending",
      },
    };

    if (vdoCipherVideoId) {
      lessonData.video.vdoCipherVideoId = vdoCipherVideoId;
      lessonData.video.encodingStatus = "processing";
      lessonData.video.provider = "vdocipher";
    } else if (videoFile) {
      lessonData.video.provider = "gcs";
      lessonData.video.gcsPath = await uploadVideo(
        videoFile.buffer,
        videoFile.originalname,
        videoFile.mimetype,
      );
      lessonData.video.encodingStatus = "ready";
    }

    if (resourceFiles.length > 0) {
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

    const lesson = await Lesson.create(lessonData);
    await recalculateCourseStats(course._id);

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
    const videoFile = req.files?.video?.[0];
    const resourceFiles = req.files?.resources || [];

    if (title) {
      lesson.title = title;
      lesson.slug = await generateUniqueSlug(Lesson, title, lesson._id);
    }
    if (type) lesson.type = type;
    if (order !== undefined) lesson.order = Number(order);
    if (isPreview !== undefined)
      lesson.isPreview = isPreview === "true" || isPreview === true;
    if (isPublished !== undefined)
      lesson.isPublished = isPublished !== "false" && isPublished !== false;
    if (contentBlocks !== undefined)
      lesson.contentBlocks = parseJsonField(contentBlocks, []) || [];
    if (resources !== undefined)
      lesson.resources = parseJsonField(resources, lesson.resources) || [];
    if (moduleId) {
      const targetModule = await CourseModule.findById(moduleId);
      if (!targetModule || !entityBelongsToCourse(targetModule, course._id)) {
        return res.status(400).json({ message: "Invalid module" });
      }
      lesson.moduleId = moduleId;
    }
    if (durationSeconds !== undefined) {
      lesson.video = lesson.video || {};
      lesson.video.durationSeconds = Number(durationSeconds) || 0;
    }

    if (
      vdoCipherVideoId &&
      vdoCipherVideoId !== lesson.video?.vdoCipherVideoId
    ) {
      if (lesson.video?.vdoCipherVideoId) {
        await deleteVdocipherVideo(lesson.video.vdoCipherVideoId);
      }
      if (lesson.video?.gcsPath) await deleteGcsFile(lesson.video.gcsPath);
      lesson.video = lesson.video || {};
      lesson.video.vdoCipherVideoId = vdoCipherVideoId;
      lesson.video.provider = "vdocipher";
      lesson.video.encodingStatus = "processing";
      lesson.video.gcsPath = "";
    } else if (videoFile) {
      if (lesson.video?.vdoCipherVideoId) {
        await deleteVdocipherVideo(lesson.video.vdoCipherVideoId);
        lesson.video.vdoCipherVideoId = "";
      }
      if (lesson.video?.gcsPath) await deleteGcsFile(lesson.video.gcsPath);
      lesson.video = lesson.video || {};
      lesson.video.gcsPath = await uploadVideo(
        videoFile.buffer,
        videoFile.originalname,
        videoFile.mimetype,
      );
      lesson.video.provider = "gcs";
      lesson.video.encodingStatus = "ready";
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

    await lesson.save();
    await recalculateCourseStats(lesson.courseId);

    res.status(200).json({ message: "Lesson updated", lesson });
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
    await recalculateCourseStats(courseId);

    res.status(200).json({ message: "Lesson deleted" });
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
        await CourseModule.findByIdAndUpdate(mod._id, { order: mod.order });
      }
      if (Array.isArray(mod.lessons)) {
        for (const lesson of mod.lessons) {
          if (lesson._id) {
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
    }

    const hasAccess = canAccessLesson(req.user, lesson, enrollment);
    if (!hasAccess) {
      return res
        .status(403)
        .json({ message: "You do not have access to this lesson" });
    }

    const lessonObj = lesson.toObject();
    let videoUrl = null;
    let playback = null;
    const staff = isStaff(req.user);

    if (lesson.type === "video") {
      if (lesson.video?.vdoCipherVideoId) {
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
      } else if (lesson.video?.gcsPath && staff) {
        videoUrl = await getSignedVideoUrl(lesson.video.gcsPath);
        delete lessonObj.video.gcsPath;
      } else if (!staff) {
        return res.status(403).json({
          message:
            "This lesson is only available through protected streaming. Please contact support.",
        });
      }
    } else if (lesson.video?.gcsPath && staff) {
      videoUrl = await getSignedVideoUrl(lesson.video.gcsPath);
      delete lessonObj.video.gcsPath;
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
      videoUrl,
      playback,
      quiz,
      enrollment,
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

    const quiz = await Quiz.findOneAndUpdate(
      { lessonId: lesson._id },
      {
        lessonId: lesson._id,
        courseId: lesson.courseId,
        passingScore: passingScore ? Number(passingScore) : 70,
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
