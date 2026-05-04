const mongoose = require("mongoose");

const studentProjectCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
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

studentProjectCategorySchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model(
  "StudentProjectCategory",
  studentProjectCategorySchema,
);
