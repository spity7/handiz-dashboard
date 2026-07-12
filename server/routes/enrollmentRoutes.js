const express = require("express");
const router = express.Router();
const protectRoute = require("../middlewares/protectRoute");
const authorizePermission = require("../middlewares/authorizePermission");
const {
  getMyEnrollments,
  getEnrollmentById,
  getCourseEnrollments,
  adminCreateEnrollment,
  revokeEnrollment,
  getAllEnrollments,
} = require("../controllers/enrollmentController");

router.get(
  "/enrollments/me",
  protectRoute,
  authorizePermission("courses:enroll"),
  getMyEnrollments,
);
router.get(
  "/enrollments/:id",
  protectRoute,
  authorizePermission("courses:enroll"),
  getEnrollmentById,
);
router.get(
  "/courses/:id/enrollments",
  protectRoute,
  authorizePermission("courses:manage"),
  getCourseEnrollments,
);
router.get(
  "/enrollments",
  protectRoute,
  authorizePermission("enrollments:manage"),
  getAllEnrollments,
);
router.post(
  "/enrollments",
  protectRoute,
  authorizePermission("enrollments:manage"),
  adminCreateEnrollment,
);
router.delete(
  "/enrollments/:id",
  protectRoute,
  authorizePermission("enrollments:manage"),
  revokeEnrollment,
);

module.exports = router;
