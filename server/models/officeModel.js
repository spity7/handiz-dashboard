const mongoose = require("mongoose");

const officeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Office title is required"],
      trim: true,
    },
    location: {
      type: [String],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one location is required",
      },
    },
    locationMap: {
      type: String,
      required: [true, "Office location map is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Office email is required"],
      trim: true,
    },
    instagram: {
      type: String,
      required: [true, "Office instagram is required"],
      trim: true,
    },
    linkedin: {
      type: String,
      required: [true, "Office linkedin is required"],
      trim: true,
    },
    teamNb: {
      type: Number,
      required: [true, "Office teamNb is required"],
    },
    order: {
      type: Number,
      default: 999,
    },
    thumbnailUrl: {
      type: String,
      required: [true, "Thumbnail image URL is required"],
    },
    category: {
      type: [String],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one category is required",
      },
    },
    status: {
      type: [String],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one status is required",
      },
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  },
);

module.exports = mongoose.model("Office", officeSchema);
