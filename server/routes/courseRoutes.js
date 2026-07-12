const express = require("express");
const multer = require("multer");
const router = express.Router();
const protectRoute = require("../middlewares/protectRoute");
const optionalAuth = require("../middlewares/optionalAuth");
const authorizePermission = require("../middlewares/authorizePermission");
const {
  getCourses,
  getCourseBySlug,
  getCourseById,
  getCourseAnalytics,
  createCourse,
  updateCourse,
  deleteCourse,
  restoreCourse,
  permanentlyDeleteCourse,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderCurriculum,
  getLessonBySlug,
  upsertQuiz,
} = require("../controllers/courseController");
const { enrollFree } = require("../controllers/enrollmentController");
const { createCheckoutSession } = require("../controllers/paymentController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024,
    files: 35,
  },
});

const courseUpload = upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "video", maxCount: 1 },
  { name: "resources", maxCount: 10 },
]);

// Public / optional auth
router.get("/courses", optionalAuth, getCourses);
router.get("/courses/slug/:slug", optionalAuth, getCourseBySlug);
router.get("/courses/:slug/lessons/:lessonSlug", optionalAuth, getLessonBySlug);

// Authenticated student
router.post(
  "/courses/:id/enroll",
  protectRoute,
  authorizePermission("courses:enroll"),
  enrollFree,
);
router.post(
  "/courses/:id/checkout",
  protectRoute,
  authorizePermission("courses:enroll"),
  createCheckoutSession,
);

// Admin course management
router.get(
  "/courses/admin/:id",
  protectRoute,
  authorizePermission("courses:manage"),
  getCourseById,
);
router.get(
  "/courses/:id/analytics",
  protectRoute,
  authorizePermission("courses:manage"),
  getCourseAnalytics,
);
router.post(
  "/courses",
  protectRoute,
  authorizePermission("courses:manage"),
  upload.fields([{ name: "thumbnail", maxCount: 1 }]),
  createCourse,
);
router.put(
  "/courses/:id",
  protectRoute,
  authorizePermission("courses:manage"),
  upload.fields([{ name: "thumbnail", maxCount: 1 }]),
  updateCourse,
);
router.delete(
  "/courses/:id",
  protectRoute,
  authorizePermission("courses:manage"),
  deleteCourse,
);

router.patch(
  "/courses/:id/restore",
  protectRoute,
  authorizePermission("courses:manage"),
  restoreCourse,
);

router.delete(
  "/courses/:id/permanent",
  protectRoute,
  authorizePermission("courses:manage"),
  permanentlyDeleteCourse,
);

router.post(
  "/courses/:id/modules",
  protectRoute,
  authorizePermission("courses:manage"),
  createModule,
);
router.put(
  "/courses/:id/modules/:moduleId",
  protectRoute,
  authorizePermission("courses:manage"),
  updateModule,
);
router.delete(
  "/courses/:id/modules/:moduleId",
  protectRoute,
  authorizePermission("courses:manage"),
  deleteModule,
);

router.post(
  "/courses/:id/lessons",
  protectRoute,
  authorizePermission("courses:manage"),
  courseUpload,
  createLesson,
);
router.put(
  "/courses/:id/lessons/:lessonId",
  protectRoute,
  authorizePermission("courses:manage"),
  courseUpload,
  updateLesson,
);
router.delete(
  "/courses/:id/lessons/:lessonId",
  protectRoute,
  authorizePermission("courses:manage"),
  deleteLesson,
);
router.patch(
  "/courses/:id/curriculum/reorder",
  protectRoute,
  authorizePermission("courses:manage"),
  reorderCurriculum,
);
router.put(
  "/courses/:id/lessons/:lessonId/quiz",
  protectRoute,
  authorizePermission("courses:manage"),
  upsertQuiz,
);

module.exports = router;
