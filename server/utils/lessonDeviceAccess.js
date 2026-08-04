const { isStaff } = require("./courseAccess");
const {
  isLessonDeviceEnforced,
  getRegistration,
  registerDevice,
  touchDevice,
  sendLessonDeviceError,
  LESSON_DEVICE_ERROR,
} = require("./lessonDeviceSession");
const {
  LESSON_DEVICE_COOKIE,
  setLessonDeviceCookie,
} = require("./helpers/lessonDeviceCookie");
const {
  notifyLessonDeviceConflictSafe,
} = require("./helpers/sendLessonDeviceConflictNotification");
const {
  logAccessDeniedConflict,
  logAccessDeniedBlocked,
} = require("./lessonDeviceAudit");
const { isBrowserLessonRequest } = require("./lessonDeviceMeta");

const rejectRegisteredElsewhere = (req, res, user, registration) => {
  logAccessDeniedConflict(req, user, registration);
  notifyLessonDeviceConflictSafe(req, user);
  sendLessonDeviceError(
    res,
    LESSON_DEVICE_ERROR.REGISTERED_ELSEWHERE,
    "This account is registered on another device. Contact support to change devices.",
  );
  return false;
};

/**
 * Enforces single-device lesson access for enrolled students.
 * Returns true when access is allowed; sends 403 and returns false otherwise.
 */
const assertLessonDeviceAccess = async (req, res) => {
  if (!isLessonDeviceEnforced()) return true;
  if (!req.user) return true;
  if (isStaff(req.user)) return true;
  if (!isBrowserLessonRequest(req)) return true;

  const userId = req.user._id;
  const cookieId = req.cookies?.[LESSON_DEVICE_COOKIE];
  const registration = await getRegistration(userId);

  if (!registration) {
    const sessionId = await registerDevice(userId, req);
    if (!sessionId) {
      const activeRegistration = await getRegistration(userId);
      return rejectRegisteredElsewhere(req, res, req.user, activeRegistration);
    }
    setLessonDeviceCookie(res, sessionId);
    return true;
  }

  if (registration.status === "blocked") {
    logAccessDeniedBlocked(req, req.user, registration);
    sendLessonDeviceError(
      res,
      LESSON_DEVICE_ERROR.ACCESS_BLOCKED,
      "Lesson access has been suspended. Contact support.",
    );
    return false;
  }

  if (cookieId && cookieId === registration.sessionId) {
    await touchDevice(userId, cookieId);
    return true;
  }

  return rejectRegisteredElsewhere(req, res, req.user, registration);
};

module.exports = { assertLessonDeviceAccess };
