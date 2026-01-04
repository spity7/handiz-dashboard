const mongoose = require("mongoose");

const competitionSchema = new mongoose.Schema(
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
    prize: {
      type: String,
      required: [true, "Prize is required"],
      trim: true,
    },
    deadline: {
      type: String,
      required: [true, "Deadline is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
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
    side: {
      type: String,
      required: [true, "Side is required"],
      trim: true,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

module.exports = mongoose.model("Competition", competitionSchema);
