const User = require("../../models/userModel");
const { ROLES } = require("../../constants/permissions");
const logger = require("../../config/logger");
const { upsertUnreadNotification } = require("./notificationService");
const { getRegistration } = require("../lessonDeviceSession");
const { parseDeviceLabel } = require("../lessonDeviceMeta");

const formatStudentName = (user) => {
  if (!user) return "A student";
  const fullName = [user.firstname, user.lastname].filter(Boolean).join(" ");
  return fullName || user.username || user.email || "A student";
};

const buildLessonDeviceAdminLink = (userId) =>
  `/ecommerce/courses/lesson-devices?openDevice=1&userId=${userId}`;

const notifyLessonDeviceConflict = async (req, user) => {
  if (!user?._id) return;

  const admins = await User.find({
    role: ROLES.ADMIN,
    isVerified: true,
  }).select("_id");

  if (!admins.length) return;

  const registration = await getRegistration(user._id);
  const attemptedDeviceLabel = parseDeviceLabel(req.headers["user-agent"]);
  const registeredDeviceLabel =
    registration?.deviceLabel || "Unknown registered device";
  const studentName = formatStudentName(user);
  const link = buildLessonDeviceAdminLink(user._id);

  const title = "Lesson device access blocked";
  const message = `${studentName} tried to open a lesson from "${attemptedDeviceLabel}" but the account is registered on "${registeredDeviceLabel}".`;

  await Promise.all(
    admins.map((admin) =>
      upsertUnreadNotification({
        recipientId: admin._id,
        type: "lesson_device_conflict",
        title,
        message,
        link,
        relatedUserId: user._id,
      }),
    ),
  );
};

const notifyLessonDeviceConflictSafe = (req, user) => {
  notifyLessonDeviceConflict(req, user).catch((error) => {
    logger.error("Failed to send lesson device conflict notification:", error);
  });
};

module.exports = {
  notifyLessonDeviceConflict,
  notifyLessonDeviceConflictSafe,
};
