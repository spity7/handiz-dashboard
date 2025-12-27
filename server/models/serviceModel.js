const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Service description is required"],
    },
    iconUrl: {
      type: String,
      required: [true, "Service icon is required"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
