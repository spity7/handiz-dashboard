const mongoose = require("mongoose");
const {
  PROJECT_STATUS,
  PROJECT_STATUS_VALUES,
} = require("../constants/projectStatus");
const softDeletePlugin = require("../utils/softDeletePlugin");

const projectContentBlockSchema = {
  _id: false,
  type: {
    type: String,
    enum: ["title", "description", "image", "quote"],
    required: true,
  },
  content: {
    type: String,
    default: "",
  },
};

const projectEditableContentSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    student: { type: String, trim: true },
    area: { type: String, trim: true },
    description: { type: String },
    order: { type: Number },
    thumbnailUrl: { type: String },
    gallery: [{ type: String }],
    concept: [String],
    type: [String],
    category: [String],
    year: [String],
    location: [String],
    university: [String],
    googleMapUrl: { type: String, trim: true, default: "" },
    thesisUrl: { type: String, trim: true, default: "" },
    fileUrl: { type: String, trim: true, default: "" },
    contentBlocks: [projectContentBlockSchema],
  },
  { _id: false },
);

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
    },
    student: {
      type: String,
      required: [true, "Project student is required"],
      trim: true,
    },
    area: {
      type: String,
      required: [true, "Project area is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Project description is required"],
    },
    order: {
      type: Number,
      default: 999,
    },
    thumbnailUrl: {
      type: String,
      required: [true, "Thumbnail image URL is required"],
    },
    gallery: [
      {
        type: String, // each string is a URL
      },
    ],
    concept: {
      type: [String],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one concept is required",
      },
    },
    type: {
      type: [String],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one type is required",
      },
    },
    category: {
      type: [String],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one category is required",
      },
    },
    year: {
      type: [String],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one year is required",
      },
    },
    location: {
      type: [String],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one location is required",
      },
    },
    university: {
      type: [String],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one university is required",
      },
    },
    googleMapUrl: {
      type: String,
      trim: true,
      default: "",
    },
    thesisUrl: {
      type: String,
      trim: true,
      default: "",
    },
    fileUrl: {
      type: String,
      trim: true,
      default: "",
    },
    contentBlocks: [projectContentBlockSchema],
    hasPendingChanges: {
      type: Boolean,
      default: false,
    },
    pendingSubmittedAt: {
      type: Date,
      default: null,
    },
    pendingSubmittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    pendingChanges: {
      type: projectEditableContentSchema,
      default: null,
    },
    status: {
      type: String,
      enum: PROJECT_STATUS_VALUES,
      default: PROJECT_STATUS.PENDING,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdByRole: {
      type: String,
      enum: ["Admin", "Editor", "User"],
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  },
);

projectSchema.plugin(softDeletePlugin);

module.exports = mongoose.model("Project", projectSchema);
