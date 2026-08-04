const crypto = require("crypto");
const LessonDeviceSession = require("../models/lessonDeviceSessionModel");
const {
  LESSON_DEVICE_STATUS,
  LESSON_DEVICE_ERROR,
  LESSON_DEVICE_EVENT_ACTION,
} = require("../constants/lessonDeviceStatus");
const { getRequestMeta } = require("./lessonDeviceMeta");
const { logLessonDeviceEventSafe } = require("./lessonDeviceAudit");
const { formatIpHashShort } = require("./lessonDeviceAudit");

const isLessonDeviceEnforced = () =>
  process.env.LESSON_DEVICE_ENFORCED !== "false";

const serializeRegistration = (registration) => {
  if (!registration) return null;

  const doc =
    typeof registration.toObject === "function"
      ? registration.toObject()
      : registration;

  const user = doc.userId;
  const userId =
    user && typeof user === "object" && user._id ? user._id : doc.userId;

  const blockedBy = doc.blockedBy;
  const blockedById =
    blockedBy && typeof blockedBy === "object" && blockedBy._id
      ? blockedBy._id
      : doc.blockedBy;

  const payload = {
    _id: doc._id,
    userId,
    sessionId: doc.sessionId,
    deviceLabel: doc.deviceLabel,
    userAgent: doc.userAgent,
    ipHash: doc.ipHash,
    ipHashShort: formatIpHashShort(doc.ipHash),
    status: doc.status,
    blockReason: doc.blockReason || "",
    registeredAt: doc.registeredAt,
    lastSeenAt: doc.lastSeenAt,
    blockedAt: doc.blockedAt,
    blockedBy: blockedById,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  if (user && typeof user === "object" && user._id) {
    payload.user = {
      _id: user._id,
      firstname: user.firstname,
      lastname: user.lastname,
      username: user.username,
      email: user.email,
    };
  }

  if (blockedBy && typeof blockedBy === "object" && blockedBy._id) {
    payload.blockedByUser = {
      _id: blockedBy._id,
      firstname: blockedBy.firstname,
      lastname: blockedBy.lastname,
      username: blockedBy.username,
      email: blockedBy.email,
    };
  }

  return payload;
};

const getRegistration = (userId) => LessonDeviceSession.findOne({ userId });

const isLessonAccessBlocked = async (userId) => {
  const registration = await getRegistration(userId);
  return registration?.status === LESSON_DEVICE_STATUS.BLOCKED;
};

const registerDevice = async (userId, req) => {
  const existing = await LessonDeviceSession.findOne({ userId });
  if (existing) return null;

  const sessionId = crypto.randomUUID();
  const meta = getRequestMeta(req);

  try {
    await LessonDeviceSession.create({
      userId,
      sessionId,
      ...meta,
      registeredAt: new Date(),
      lastSeenAt: new Date(),
      status: LESSON_DEVICE_STATUS.ACTIVE,
    });

    logLessonDeviceEventSafe({
      userId,
      action: LESSON_DEVICE_EVENT_ACTION.REGISTERED,
      req,
      sessionId,
    });

    return sessionId;
  } catch (error) {
    if (error?.code === 11000) return null;
    throw error;
  }
};

const touchDevice = async (userId, sessionId) => {
  await LessonDeviceSession.updateOne(
    { userId, sessionId, status: LESSON_DEVICE_STATUS.ACTIVE },
    { $set: { lastSeenAt: new Date() } },
  );
};

const resetDevice = async (userId, adminId = null, req = null) => {
  const registration = await LessonDeviceSession.findOne({ userId });
  await LessonDeviceSession.deleteOne({ userId });

  logLessonDeviceEventSafe({
    userId,
    action: LESSON_DEVICE_EVENT_ACTION.RESET,
    req,
    adminId,
    deviceLabel: registration?.deviceLabel || "",
    userAgent: registration?.userAgent || "",
    ipHash: registration?.ipHash || "",
    sessionId: registration?.sessionId || "",
  });
};

const revokeDevice = async (userId) => {
  const registration = await LessonDeviceSession.findOne({ userId });
  await LessonDeviceSession.deleteOne({ userId });

  if (registration) {
    logLessonDeviceEventSafe({
      userId,
      action: LESSON_DEVICE_EVENT_ACTION.REVOKED_PASSWORD,
      deviceLabel: registration.deviceLabel,
      userAgent: registration.userAgent,
      ipHash: registration.ipHash,
      sessionId: registration.sessionId,
    });
  }
};

const blockDevice = async (userId, adminId, reason = "", req = null) => {
  const registration = await LessonDeviceSession.findOne({ userId });
  let result;

  if (!registration) {
    const meta = { userAgent: "", deviceLabel: "Not registered", ipHash: "" };
    result = await LessonDeviceSession.create({
      userId,
      sessionId: crypto.randomUUID(),
      ...meta,
      status: LESSON_DEVICE_STATUS.BLOCKED,
      blockedAt: new Date(),
      blockedBy: adminId,
      blockReason: String(reason).trim(),
      registeredAt: new Date(),
      lastSeenAt: new Date(),
    });
  } else {
    registration.status = LESSON_DEVICE_STATUS.BLOCKED;
    registration.blockedAt = new Date();
    registration.blockedBy = adminId;
    registration.blockReason = String(reason).trim();
    await registration.save();
    result = registration;
  }

  logLessonDeviceEventSafe({
    userId,
    action: LESSON_DEVICE_EVENT_ACTION.BLOCKED,
    req,
    adminId,
    reason: String(reason).trim(),
    deviceLabel: result.deviceLabel,
    userAgent: result.userAgent,
    ipHash: result.ipHash,
    sessionId: result.sessionId,
  });

  return result;
};

const unblockDevice = async (userId, adminId, req = null) => {
  const registration = await LessonDeviceSession.findOne({ userId });
  if (!registration) return null;

  registration.status = LESSON_DEVICE_STATUS.ACTIVE;
  registration.blockedAt = null;
  registration.blockedBy = null;
  registration.blockReason = "";
  registration.lastSeenAt = new Date();
  await registration.save();

  logLessonDeviceEventSafe({
    userId,
    action: LESSON_DEVICE_EVENT_ACTION.UNBLOCKED,
    req,
    adminId,
    deviceLabel: registration.deviceLabel,
    userAgent: registration.userAgent,
    ipHash: registration.ipHash,
    sessionId: registration.sessionId,
  });

  return registration;
};

const validateDevice = async (userId, sessionId) => {
  const registration = await LessonDeviceSession.findOne({ userId });
  if (!registration) return { valid: false, reason: "none" };
  if (registration.status === LESSON_DEVICE_STATUS.BLOCKED) {
    return { valid: false, reason: "blocked", registration };
  }
  if (registration.sessionId === sessionId) {
    return { valid: true, registration };
  }
  return { valid: false, reason: "mismatch", registration };
};

const sendLessonDeviceError = (res, errorcode, message) =>
  res.status(403).json({ message, errorcode });

module.exports = {
  LESSON_DEVICE_ERROR,
  isLessonDeviceEnforced,
  serializeRegistration,
  getRegistration,
  isLessonAccessBlocked,
  registerDevice,
  touchDevice,
  resetDevice,
  revokeDevice,
  blockDevice,
  unblockDevice,
  validateDevice,
  sendLessonDeviceError,
};
