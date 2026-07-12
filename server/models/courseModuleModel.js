const mongoose = require("mongoose");

const courseModuleSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Module title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

courseModuleSchema.index({ courseId: 1, order: 1 });

module.exports = mongoose.model("CourseModule", courseModuleSchema);
