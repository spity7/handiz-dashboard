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
      type: [String],
      validate: {
        validator: (v) => v.length > 0,
        message: "Side is required",
      },
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

module.exports = mongoose.model("Competition", competitionSchema);
