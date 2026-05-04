const mongoose = require("mongoose");

const studentProjectLocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Location name is required"],
      trim: true,
      maxlength: [80, "Name must be at most 80 characters"],
    },
    isFallback: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

studentProjectLocationSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model(
  "StudentProjectLocation",
  studentProjectLocationSchema,
);
