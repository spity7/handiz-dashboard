const mongoose = require("mongoose");
const {
  LESSON_DEVICE_EVENT_ACTION_VALUES,
} = require("../constants/lessonDeviceStatus");

const lessonDeviceEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: LESSON_DEVICE_EVENT_ACTION_VALUES,
      required: true,
      index: true,
    },
    deviceLabel: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    ipHash: {
      type: String,
      default: "",
    },
    sessionId: {
      type: String,
      default: "",
    },
    registeredDeviceLabel: {
      type: String,
      default: "",
    },
    registeredSessionId: {
      type: String,
      default: "",
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reason: {
      type: String,
      default: "",
    },
    requestPath: {
      type: String,
      default: "",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

lessonDeviceEventSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("LessonDeviceEvent", lessonDeviceEventSchema);
