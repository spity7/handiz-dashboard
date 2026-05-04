const mongoose = require("mongoose");

const studentProjectUniversitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "University name is required"],
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

studentProjectUniversitySchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model(
  "StudentProjectUniversity",
  studentProjectUniversitySchema,
);
