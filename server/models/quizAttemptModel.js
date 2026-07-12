const mongoose = require("mongoose");

const quizAttemptSchema = new mongoose.Schema(
  {
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
      required: true,
      index: true,
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    answers: [
      {
        _id: false,
        questionIndex: { type: Number, required: true },
        selectedIndex: { type: Number, required: true },
      },
    ],
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
