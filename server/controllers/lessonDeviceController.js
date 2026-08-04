const LessonDeviceSession = require("../models/lessonDeviceSessionModel");
const User = require("../models/userModel");
const {
  serializeRegistration,
  resetDevice,
  blockDevice,
  unblockDevice,
  getRegistration,
} = require("../utils/lessonDeviceSession");
const { getLessonDeviceEvents } = require("../utils/lessonDeviceAudit");
const {
  clearLessonDeviceCookie,
} = require("../utils/helpers/lessonDeviceCookie");

const populateUserFields = "firstname lastname username email";
const populateAdminFields = "firstname lastname username email";

exports.getAllLessonDevices = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 50, 1),
      200,
    );
    const skip = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const userId = String(req.query.userId || "").trim();

    const filter = {};
    if (userId) {
      filter.userId = userId;
    } else if (search) {
      const users = await User.find({
        $or: [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { firstname: { $regex: search, $options: "i" } },
          { lastname: { $regex: search, $options: "i" } },
        ],
      })
        .select("_id")
        .limit(100);
      const userIds = users.map((user) => user._id);
      if (!userIds.length) {
        return res.status(200).json({
          devices: [],
          pagination: { page, limit, total: 0, totalPages: 1 },
        });
      }
      filter.userId = { $in: userIds };
    }

    const [devices, total] = await Promise.all([
      LessonDeviceSession.find(filter)
        .populate("userId", populateUserFields)
        .populate("blockedBy", populateAdminFields)
        .sort({ lastSeenAt: -1 })
        .skip(skip)
        .limit(limit),
      LessonDeviceSession.countDocuments(filter),
    ]);

    res.status(200).json({
      devices: devices.map(serializeRegistration),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    console.error("getAllLessonDevices error:", error);
    res.status(500).json({ message: "Server error fetching lesson devices" });
  }
};

exports.getUserLessonDevice = async (req, res) => {
  try {
    const registration = await LessonDeviceSession.findOne({
      userId: req.params.userId,
    })
      .populate("userId", populateUserFields)
      .populate("blockedBy", populateAdminFields);

    const { events, pagination } = await getLessonDeviceEvents(
      req.params.userId,
      {
        page: req.query.page,
        limit: req.query.limit || 50,
      },
    );

    res.status(200).json({
      device: serializeRegistration(registration),
      events,
      eventsPagination: pagination,
    });
  } catch (error) {
    console.error("getUserLessonDevice error:", error);
    res.status(500).json({ message: "Server error fetching lesson device" });
  }
};

exports.getUserLessonDeviceEvents = async (req, res) => {
  try {
    const { events, pagination } = await getLessonDeviceEvents(
      req.params.userId,
      {
        page: req.query.page,
        limit: req.query.limit,
      },
    );

    res.status(200).json({ events, pagination });
  } catch (error) {
    console.error("getUserLessonDeviceEvents error:", error);
    res
      .status(500)
      .json({ message: "Server error fetching lesson device log" });
  }
};

exports.resetUserLessonDevice = async (req, res) => {
  try {
    await resetDevice(req.params.userId, req.user._id, req);
    clearLessonDeviceCookie(res);
    res.status(200).json({
      message:
        "Lesson device reset. The user can register a new device on their next lesson visit.",
    });
  } catch (error) {
    console.error("resetUserLessonDevice error:", error);
    res.status(500).json({ message: "Server error resetting lesson device" });
  }
};

exports.blockUserLessonDevice = async (req, res) => {
  try {
    const reason = req.body?.reason || "";
    const registration = await blockDevice(
      req.params.userId,
      req.user._id,
      reason,
      req,
    );
    res.status(200).json({
      message: "Lesson access blocked for this user.",
      device: serializeRegistration(registration),
    });
  } catch (error) {
    console.error("blockUserLessonDevice error:", error);
    res.status(500).json({ message: "Server error blocking lesson access" });
  }
};

exports.unblockUserLessonDevice = async (req, res) => {
  try {
    const registration = await unblockDevice(
      req.params.userId,
      req.user._id,
      req,
    );
    if (!registration) {
      return res
        .status(404)
        .json({ message: "No lesson device registration found" });
    }
    res.status(200).json({
      message: "Lesson access restored for this user.",
      device: serializeRegistration(registration),
    });
  } catch (error) {
    console.error("unblockUserLessonDevice error:", error);
    res.status(500).json({ message: "Server error unblocking lesson access" });
  }
};

exports.getMyLessonDevice = async (req, res) => {
  try {
    const registration = await getRegistration(req.user._id);
    res.status(200).json({ device: serializeRegistration(registration) });
  } catch (error) {
    console.error("getMyLessonDevice error:", error);
    res.status(500).json({ message: "Server error fetching lesson device" });
  }
};
