const mongoose = require("mongoose");
const {
  ENROLLMENT_STATUS,
  ENROLLMENT_STATUS_VALUES,
  ENROLLMENT_SOURCE,
  ENROLLMENT_SOURCE_VALUES,
  ENROLLMENT_REVOKED_REASON,
  ENROLLMENT_REVOKED_REASON_VALUES,
} = require("../constants/enrollmentStatus");

const enrollmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ENROLLMENT_STATUS_VALUES,
      default: ENROLLMENT_STATUS.ACTIVE,
    },
    source: {
      type: String,
      enum: ENROLLMENT_SOURCE_VALUES,
      default: ENROLLMENT_SOURCE.FREE,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    lastLessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      default: null,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
    revokedReason: {
      type: String,
      enum: ENROLLMENT_REVOKED_REASON_VALUES,
      default: null,
    },
    statusBeforeRevoke: {
      type: String,
      enum: ENROLLMENT_STATUS_VALUES,
      default: null,
    },
  },
  { timestamps: true },
);

enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model("Enrollment", enrollmentSchema);
