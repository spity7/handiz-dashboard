const mongoose = require("mongoose");

const studentProjectYearSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Year name is required"],
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

studentProjectYearSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model(
  "StudentProjectYear",
  studentProjectYearSchema,
);
