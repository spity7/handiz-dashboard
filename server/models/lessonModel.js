const mongoose = require("mongoose");
const {
  LESSON_TYPE,
  LESSON_TYPE_VALUES,
  LESSON_CONTENT_BLOCK_TYPES,
} = require("../constants/courseStatus");

const lessonSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseModule",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Lesson title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      enum: LESSON_TYPE_VALUES,
      default: LESSON_TYPE.VIDEO,
    },
    video: {
      provider: {
        type: String,
        enum: ["gcs", "vdocipher"],
        default: "vdocipher",
      },
      vdoCipherVideoId: { type: String, default: "", index: true },
      encodingStatus: {
        type: String,
        enum: ["pending", "processing", "ready", "failed"],
        default: "pending",
      },
      gcsPath: { type: String, default: "" },
      durationSeconds: { type: Number, default: 0 },
      thumbnailUrl: { type: String, default: "" },
    },
    contentBlocks: [
      {
        _id: false,
        type: {
          type: String,
          enum: LESSON_CONTENT_BLOCK_TYPES,
          required: true,
        },
        content: { type: String, default: "" },
      },
    ],
    resources: [
      {
        _id: false,
        title: { type: String, default: "" },
        url: { type: String, default: "" },
        fileType: { type: String, default: "" },
      },
    ],
    isPreview: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

lessonSchema.index({ courseId: 1, slug: 1 }, { unique: true });
lessonSchema.index({ moduleId: 1, order: 1 });

module.exports = mongoose.model("Lesson", lessonSchema);
