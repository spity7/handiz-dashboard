const Course = require("../models/courseModel");
const Enrollment = require("../models/enrollmentModel");
const User = require("../models/userModel");
const {
  ENROLLMENT_STATUS,
  ENROLLMENT_SOURCE,
} = require("../constants/enrollmentStatus");
const { canEnrollInCourse } = require("../utils/courseAccess");
const {
  buildCurriculum,
  sanitizeLessonForClient,
  notifyCourseEnrolled,
} = require("../utils/courseHelpers");
const { canAccessLesson, isStaff } = require("../utils/courseAccess");
const { isEffectivelyFree } = require("../utils/coursePricing");

exports.enrollFree = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    if (!canEnrollInCourse(req.user, course)) {
      return res
        .status(400)
        .json({ message: "Course is not available for enrollment" });
    }

    if (!isEffectivelyFree(course.pricing)) {
      return res.status(400).json({
        message: "This course requires payment. Please use checkout.",
      });
    }

    const existing = await Enrollment.findOne({
      userId: req.user._id,
      courseId: course._id,
    });

    if (existing) {
      if (existing.status === ENROLLMENT_STATUS.REVOKED) {
        existing.status = ENROLLMENT_STATUS.ACTIVE;
        existing.source = ENROLLMENT_SOURCE.FREE;
        existing.enrolledAt = new Date();
        await existing.save();
        await Course.findByIdAndUpdate(course._id, {
          $inc: { enrollmentCount: 1 },
        });
        await notifyCourseEnrolled(req.user._id, course);
        return res
          .status(200)
          .json({ message: "Re-enrolled", enrollment: existing });
      }
      return res
        .status(200)
        .json({ message: "Already enrolled", enrollment: existing });
    }

    const enrollment = await Enrollment.create({
      userId: req.user._id,
      courseId: course._id,
      source: ENROLLMENT_SOURCE.FREE,
    });

    await Course.findByIdAndUpdate(course._id, {
      $inc: { enrollmentCount: 1 },
    });
    await notifyCourseEnrolled(req.user._id, course);

    res.status(201).json({ message: "Enrolled successfully", enrollment });
  } catch (error) {
    console.error("enrollFree error:", error);
    res
      .status(500)
      .json({ message: "Server error enrolling", error: error.message });
  }
};

exports.getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      userId: req.user._id,
      status: { $ne: ENROLLMENT_STATUS.REVOKED },
    })
      .populate("courseId")
      .populate("lastLessonId", "title slug")
      .sort({ lastAccessedAt: -1 });

    const visibleEnrollments = enrollments.filter((enrollment) =>
      Boolean(enrollment.courseId),
    );

    res.status(200).json({ enrollments: visibleEnrollments });
  } catch (error) {
    console.error("getMyEnrollments error:", error);
    res.status(500).json({ message: "Server error fetching enrollments" });
  }
};

exports.getEnrollmentById = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate("courseId")
      .populate("lastLessonId", "title slug");

    if (!enrollment)
      return res.status(404).json({ message: "Enrollment not found" });

    const isOwner = String(enrollment.userId) === String(req.user._id);
    const isAdmin = req.user.role === "Admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!enrollment.courseId) {
      return res.status(404).json({ message: "Course is no longer available" });
    }

    const course = enrollment.courseId;
    const curriculum = await buildCurriculum(course._id, {
      hideEmptyModules: true,
    });

    const sanitizedCurriculum = curriculum.map((mod) => ({
      ...mod,
      lessons: mod.lessons.map((lesson) => {
        const hasAccess = canAccessLesson(req.user, lesson, enrollment);
        return sanitizeLessonForClient(lesson, {
          hasAccess,
          isStaff: isStaff(req.user),
        });
      }),
    }));

    res.status(200).json({ enrollment, curriculum: sanitizedCurriculum });
  } catch (error) {
    console.error("getEnrollmentById error:", error);
    res.status(500).json({ message: "Server error fetching enrollment" });
  }
};

exports.getCourseEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ courseId: req.params.id })
      .populate("userId", "firstname lastname email username")
      .populate("lastLessonId", "title slug")
      .sort({ enrolledAt: -1 });

    res.status(200).json({ enrollments });
  } catch (error) {
    console.error("getCourseEnrollments error:", error);
    res.status(500).json({ message: "Server error fetching enrollments" });
  }
};

exports.adminCreateEnrollment = async (req, res) => {
  try {
    const { userId, courseId } = req.body;
    if (!userId || !courseId) {
      return res
        .status(400)
        .json({ message: "userId and courseId are required" });
    }

    const [user, course] = await Promise.all([
      User.findById(userId),
      Course.findById(courseId),
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!course) return res.status(404).json({ message: "Course not found" });

    let enrollment = await Enrollment.findOne({ userId, courseId });
    if (enrollment) {
      const wasRevoked = enrollment.status === ENROLLMENT_STATUS.REVOKED;
      enrollment.status = ENROLLMENT_STATUS.ACTIVE;
      enrollment.source = ENROLLMENT_SOURCE.ADMIN;
      await enrollment.save();
      if (wasRevoked) {
        await Course.findByIdAndUpdate(courseId, {
          $inc: { enrollmentCount: 1 },
        });
      }
    } else {
      enrollment = await Enrollment.create({
        userId,
        courseId,
        source: ENROLLMENT_SOURCE.ADMIN,
      });
      await Course.findByIdAndUpdate(courseId, {
        $inc: { enrollmentCount: 1 },
      });
    }

    await notifyCourseEnrolled(userId, course);
    res.status(201).json({ message: "Enrollment created", enrollment });
  } catch (error) {
    console.error("adminCreateEnrollment error:", error);
    res.status(500).json({ message: "Server error creating enrollment" });
  }
};

exports.revokeEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment)
      return res.status(404).json({ message: "Enrollment not found" });

    const wasCountable =
      enrollment.status === ENROLLMENT_STATUS.ACTIVE ||
      enrollment.status === ENROLLMENT_STATUS.COMPLETED;

    enrollment.status = ENROLLMENT_STATUS.REVOKED;
    await enrollment.save();

    if (wasCountable) {
      await Course.findByIdAndUpdate(enrollment.courseId, {
        $inc: { enrollmentCount: -1 },
      });
    }

    res.status(200).json({ message: "Enrollment revoked" });
  } catch (error) {
    console.error("revokeEnrollment error:", error);
    res.status(500).json({ message: "Server error revoking enrollment" });
  }
};

exports.getAllEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find()
      .populate("userId", "firstname lastname email")
      .populate("courseId", "title slug")
      .sort({ enrolledAt: -1 })
      .limit(500);

    res.status(200).json({ enrollments });
  } catch (error) {
    console.error("getAllEnrollments error:", error);
    res.status(500).json({ message: "Server error fetching enrollments" });
  }
};
