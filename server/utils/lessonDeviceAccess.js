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
const {
  getRequestMeta,
  isBrowserLessonRequest,
} = require("./lessonDeviceMeta");
const { LESSON_DEVICE_STATUS } = require("../constants/lessonDeviceStatus");

/** Window for same-browser parallel requests (e.g. after admin device reset). */
const REGISTRATION_GRACE_MS =
  Number(process.env.LESSON_DEVICE_REGISTRATION_GRACE_MS) || 15000;

const requestMatchesRegistration = (req, registration) => {
  if (!registration) return false;
  const meta = getRequestMeta(req);
  return (
    registration.userAgent === meta.userAgent &&
    registration.ipHash === meta.ipHash
  );
};

const isRecentlyRegistered = (registration) => {
  if (!registration?.registeredAt) return false;
  const registeredAt = new Date(registration.registeredAt).getTime();
  if (Number.isNaN(registeredAt)) return false;
  return Date.now() - registeredAt <= REGISTRATION_GRACE_MS;
};

const adoptActiveSession = async (req, res, userId, registration) => {
  setLessonDeviceCookie(res, registration.sessionId);
  await touchDevice(userId, registration.sessionId);
  return true;
};

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
      if (
        activeRegistration?.status === LESSON_DEVICE_STATUS.ACTIVE &&
        requestMatchesRegistration(req, activeRegistration)
      ) {
        return adoptActiveSession(req, res, userId, activeRegistration);
      }
      return rejectRegisteredElsewhere(req, res, req.user, activeRegistration);
    }
    setLessonDeviceCookie(res, sessionId);
    await touchDevice(userId, sessionId);
    return true;
  }

  if (registration.status === LESSON_DEVICE_STATUS.BLOCKED) {
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

  if (
    registration.status === LESSON_DEVICE_STATUS.ACTIVE &&
    requestMatchesRegistration(req, registration) &&
    isRecentlyRegistered(registration)
  ) {
    return adoptActiveSession(req, res, userId, registration);
  }

  return rejectRegisteredElsewhere(req, res, req.user, registration);
};

module.exports = { assertLessonDeviceAccess };
