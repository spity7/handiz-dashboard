const express = require("express");
const router = express.Router();
const protectRoute = require("../middlewares/protectRoute");
const authorizePermission = require("../middlewares/authorizePermission");
const {
  getAllLessonDevices,
  getUserLessonDevice,
  getUserLessonDeviceEvents,
  resetUserLessonDevice,
  blockUserLessonDevice,
  unblockUserLessonDevice,
  getMyLessonDevice,
} = require("../controllers/lessonDeviceController");

router.get(
  "/me/lesson-device",
  protectRoute,
  authorizePermission("courses:enroll"),
  getMyLessonDevice,
);

router.get(
  "/admin/lesson-devices",
  protectRoute,
  authorizePermission("enrollments:manage"),
  getAllLessonDevices,
);

router.get(
  "/admin/users/:userId/lesson-device",
  protectRoute,
  authorizePermission("enrollments:manage"),
  getUserLessonDevice,
);

router.get(
  "/admin/users/:userId/lesson-device/events",
  protectRoute,
  authorizePermission("enrollments:manage"),
  getUserLessonDeviceEvents,
);

router.post(
  "/admin/users/:userId/lesson-device/reset",
  protectRoute,
  authorizePermission("enrollments:manage"),
  resetUserLessonDevice,
);

router.post(
  "/admin/users/:userId/lesson-device/block",
  protectRoute,
  authorizePermission("enrollments:manage"),
  blockUserLessonDevice,
);

router.post(
  "/admin/users/:userId/lesson-device/unblock",
  protectRoute,
  authorizePermission("enrollments:manage"),
  unblockUserLessonDevice,
);

module.exports = router;
