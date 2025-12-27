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
    category: {
      type: String,
      required: [true, "Category is required"],
    },
    description: {
      type: String,
      required: [true, "Project description is required"],
    },
    order: {
      type: Number,
      default: 999,
    },
    location: {
      type: String,
      required: [true, "Project location is required"],
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
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

module.exports = mongoose.model("Project", projectSchema);
