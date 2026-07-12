const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(
  {
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
      unique: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    passingScore: {
      type: Number,
      default: 70,
      min: 0,
      max: 100,
    },
    questions: [
      {
        _id: false,
        prompt: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctIndex: { type: Number, required: true, min: 0 },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Quiz", quizSchema);
