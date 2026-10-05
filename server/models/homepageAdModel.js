const mongoose = require("mongoose");

const homepageAdSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 120,
    },
    metaPrimary: {
      type: String,
      required: [true, "Primary meta label is required"],
      trim: true,
      maxlength: 80,
    },
    metaSecondary: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    externalUrl: {
      type: String,
      required: [true, "External URL is required"],
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      required: [true, "Thumbnail image URL is required"],
    },
    order: {
      type: Number,
      default: 999,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    startsAt: {
      type: Date,
      default: null,
    },
    endsAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("HomepageAd", homepageAdSchema);
