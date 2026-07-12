const express = require("express");
const router = express.Router();
const protectRoute = require("../middlewares/protectRoute");
const authorizePermission = require("../middlewares/authorizePermission");
const {
  updateLessonProgress,
  getLessonProgress,
} = require("../controllers/progressController");
const {
  submitQuizAttempt,
  getCertificate,
  getOrders,
} = require("../controllers/paymentController");

router.patch(
  "/progress/lessons/:lessonId",
  protectRoute,
  authorizePermission("courses:enroll"),
  updateLessonProgress,
);
router.get(
  "/progress/courses/:courseId",
  protectRoute,
  authorizePermission("courses:enroll"),
  getLessonProgress,
);
router.post(
  "/quizzes/:id/attempt",
  protectRoute,
  authorizePermission("courses:enroll"),
  submitQuizAttempt,
);
router.get(
  "/certificates/:enrollmentId",
  protectRoute,
  authorizePermission("courses:enroll"),
  getCertificate,
);
router.get(
  "/orders",
  protectRoute,
  authorizePermission("courses:orders:read"),
  getOrders,
);

module.exports = router;
