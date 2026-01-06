const mongoose = require("mongoose");

const aiToolSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    link: {
      type: String,
      required: [true, "Link is required"],
    },
    order: {
      type: Number,
      default: 999,
    },
    thumbnailUrl: {
      type: String,
      required: [true, "Thumbnail image URL is required"],
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

module.exports = mongoose.model("AiTool", aiToolSchema);
