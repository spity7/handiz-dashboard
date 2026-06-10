const User = require("../models/userModel");
const UserActionRequest = require("../models/userActionRequestModel");
const Notification = require("../models/notificationModel");
const { ROLES } = require("../constants/permissions");
const logger = require("../config/logger");

const executeUpdateEmployee = async (targetUserId, payload) => {
  const { firstname, lastname, username, role } = payload;
  const usernameTaken = await User.findOne({
    username,
    _id: { $ne: targetUserId },
  });
  if (usernameTaken) {
    throw new Error("Username already taken");
  }
  return User.findByIdAndUpdate(
    targetUserId,
    { firstname, lastname, username, role },
    { new: true, runValidators: true },
  ).select("-password");
};

const executeDeleteEmployee = async (targetUserId) => {
  const adminCount = await User.countDocuments({ role: ROLES.ADMIN });
  const target = await User.findById(targetUserId);
  if (!target) throw new Error("User not found");
  if (target.role === ROLES.ADMIN && adminCount <= 1) {
    throw new Error("Cannot delete the last Admin account");
  }
  await User.findByIdAndDelete(targetUserId);
  return target;
};

const notifyUser = async ({
  recipientId,
  type,
  title,
  message,
  link,
  relatedRequestId,
}) => {
  await Notification.create({
    recipientId,
    type,
    title,
    message,
    link,
    relatedRequestId,
  });
};

exports.createRequest = async (req, res) => {
  try {
    const { action, targetUserId, payload = {} } = req.body;

    if (!["update", "delete"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const target = await User.findById(targetUserId);
    if (!target) {
      return res.status(404).json({ message: "Target user not found" });
    }
    if (target.role !== ROLES.USER) {
      return res
        .status(403)
        .json({ message: "Editors can only manage User accounts" });
    }

    const existing = await UserActionRequest.findOne({
      targetUserId,
      action,
      status: "pending",
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: "A pending request already exists for this action" });
    }

    const request = await UserActionRequest.create({
      requestedBy: req.user._id,
      action,
      targetUserId,
      payload,
    });

    const admins = await User.find({
      role: ROLES.ADMIN,
      isVerified: true,
    }).select("_id");
    await Notification.insertMany(
      admins.map((a) => ({
        recipientId: a._id,
        type: "user_action_request",
        title: "User management request",
        message: `${req.user.firstname} ${req.user.lastname} requested to ${action} user ${target.username}.`,
        link: "/pages/user-requests",
        relatedRequestId: request._id,
      })),
    );

    res.status(201).json({ request });
  } catch (error) {
    logger.error("createRequest error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const requests = await UserActionRequest.find(query)
      .populate("requestedBy", "firstname lastname username email role")
      .populate("targetUserId", "firstname lastname username email role")
      .populate("reviewedBy", "firstname lastname username")
      .sort({ createdAt: -1 });
    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getMyRequests = async (req, res) => {
  try {
    const requests = await UserActionRequest.find({ requestedBy: req.user._id })
      .populate("targetUserId", "firstname lastname username email role")
      .populate("reviewedBy", "firstname lastname username")
      .sort({ createdAt: -1 });
    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.reviewRequest = async (req, res) => {
  try {
    const { status, reviewNote = "" } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Status must be approved or rejected" });
    }

    const request = await UserActionRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already reviewed" });
    }

    request.status = status;
    request.reviewedBy = req.user._id;
    request.reviewNote = reviewNote;

    if (status === "approved") {
      if (request.action === "update") {
        await executeUpdateEmployee(request.targetUserId, request.payload);
      } else if (request.action === "delete") {
        await executeDeleteEmployee(request.targetUserId);
      }
      request.executedAt = new Date();
    }

    await request.save();

    await notifyUser({
      recipientId: request.requestedBy,
      type: "user_action_decided",
      title: `Request ${status}`,
      message: `Your request to ${request.action} a user was ${status}.${reviewNote ? ` Note: ${reviewNote}` : ""}`,
      link: "/pages/users",
      relatedRequestId: request._id,
    });

    res.status(200).json({ request });
  } catch (error) {
    logger.error("reviewRequest error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};
