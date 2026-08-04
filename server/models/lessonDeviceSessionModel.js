const mongoose = require("mongoose");
const {
  LESSON_DEVICE_STATUS,
  LESSON_DEVICE_STATUS_VALUES,
} = require("../constants/lessonDeviceStatus");

const lessonDeviceSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
      default: "",
    },
    deviceLabel: {
      type: String,
      default: "Unknown device",
    },
    ipHash: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: LESSON_DEVICE_STATUS_VALUES,
      default: LESSON_DEVICE_STATUS.ACTIVE,
    },
    blockedAt: {
      type: Date,
      default: null,
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    blockReason: {
      type: String,
      default: "",
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "LessonDeviceSession",
  lessonDeviceSessionSchema,
);
