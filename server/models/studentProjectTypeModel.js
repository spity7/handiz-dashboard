const mongoose = require("mongoose");

const studentProjectTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Type name is required"],
      trim: true,
      maxlength: [80, "Name must be at most 80 characters"],
    },
    /** Single system bucket: projects are moved here when their type is deleted */
    isFallback: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

studentProjectTypeSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model(
  "StudentProjectType",
  studentProjectTypeSchema,
);
