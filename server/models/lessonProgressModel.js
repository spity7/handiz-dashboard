const mongoose = require("mongoose");

const lessonProgressSchema = new mongoose.Schema(
  {
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
      required: true,
      index: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
      index: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    watchedSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPosition: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

lessonProgressSchema.index({ enrollmentId: 1, lessonId: 1 }, { unique: true });

module.exports = mongoose.model("LessonProgress", lessonProgressSchema);
