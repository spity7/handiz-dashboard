const LessonDeviceEvent = require("../models/lessonDeviceEventModel");
const {
  LESSON_DEVICE_EVENT_ACTION,
} = require("../constants/lessonDeviceStatus");
const { getRequestMeta, parseDeviceLabel } = require("./lessonDeviceMeta");

const formatIpHashShort = (ipHash = "") => {
  if (!ipHash) return "";
  return ipHash.slice(0, 12);
};

const serializeLessonDeviceEvent = (event) => {
  if (!event) return null;

  const doc = typeof event.toObject === "function" ? event.toObject() : event;

  const admin = doc.adminId;
  const adminId =
    admin && typeof admin === "object" && admin._id ? admin._id : doc.adminId;

  const payload = {
    _id: doc._id,
    userId: doc.userId,
    action: doc.action,
    deviceLabel: doc.deviceLabel || "",
    userAgent: doc.userAgent || "",
    ipHash: doc.ipHash || "",
    ipHashShort: formatIpHashShort(doc.ipHash),
    sessionId: doc.sessionId || "",
    registeredDeviceLabel: doc.registeredDeviceLabel || "",
    registeredSessionId: doc.registeredSessionId || "",
    adminId,
    reason: doc.reason || "",
    requestPath: doc.requestPath || "",
    createdAt: doc.createdAt,
  };

  if (admin && typeof admin === "object" && admin._id) {
    payload.admin = {
      _id: admin._id,
      firstname: admin.firstname,
      lastname: admin.lastname,
      username: admin.username,
      email: admin.email,
    };
  }

  return payload;
};

const logLessonDeviceEvent = async ({
  userId,
  action,
  req = null,
  adminId = null,
  deviceLabel = "",
  userAgent = "",
  ipHash = "",
  sessionId = "",
  registeredDeviceLabel = "",
  registeredSessionId = "",
  reason = "",
  requestPath = "",
}) => {
  if (!userId || !action) return null;

  let meta = {
    deviceLabel,
    userAgent,
    ipHash,
  };

  if (req) {
    const requestMeta = getRequestMeta(req);
    meta = {
      deviceLabel: deviceLabel || requestMeta.deviceLabel,
      userAgent: userAgent || requestMeta.userAgent,
      ipHash: ipHash || requestMeta.ipHash,
    };
    requestPath = requestPath || req.originalUrl || req.path || "";
  }

  return LessonDeviceEvent.create({
    userId,
    action,
    ...meta,
    sessionId,
    registeredDeviceLabel,
    registeredSessionId,
    adminId,
    reason: String(reason || "").trim(),
    requestPath,
  });
};

const logLessonDeviceEventSafe = (payload) => {
  logLessonDeviceEvent(payload).catch((error) => {
    console.error("Failed to log lesson device event:", error);
  });
};

const getLessonDeviceEvents = async (userId, { page = 1, limit = 50 } = {}) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [events, total] = await Promise.all([
    LessonDeviceEvent.find({ userId })
      .populate("adminId", "firstname lastname username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit),
    LessonDeviceEvent.countDocuments({ userId }),
  ]);

  return {
    events: events.map(serializeLessonDeviceEvent),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(Math.ceil(total / safeLimit), 1),
    },
  };
};

const logAccessDeniedConflict = (req, user, registration) => {
  logLessonDeviceEventSafe({
    userId: user._id,
    action: LESSON_DEVICE_EVENT_ACTION.ACCESS_DENIED_CONFLICT,
    req,
    deviceLabel: parseDeviceLabel(req.headers["user-agent"]),
    registeredDeviceLabel: registration?.deviceLabel || "",
    registeredSessionId: registration?.sessionId || "",
  });
};

const logAccessDeniedBlocked = (req, user, registration) => {
  logLessonDeviceEventSafe({
    userId: user._id,
    action: LESSON_DEVICE_EVENT_ACTION.ACCESS_DENIED_BLOCKED,
    req,
    registeredDeviceLabel: registration?.deviceLabel || "",
    registeredSessionId: registration?.sessionId || "",
    reason: registration?.blockReason || "",
  });
};

module.exports = {
  formatIpHashShort,
  serializeLessonDeviceEvent,
  logLessonDeviceEvent,
  logLessonDeviceEventSafe,
  getLessonDeviceEvents,
  logAccessDeniedConflict,
  logAccessDeniedBlocked,
};
