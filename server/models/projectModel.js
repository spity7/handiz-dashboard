const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Project title is required"],
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
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

module.exports = mongoose.model("Project", projectSchema);
