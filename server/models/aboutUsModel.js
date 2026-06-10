const mongoose = require("mongoose");

const aboutUsSchema = new mongoose.Schema(
  {
    contentBlocks: [
      {
        _id: false,
        type: {
          type: String,
          enum: ["title", "description", "image", "quote"],
          required: true,
        },
        content: {
          type: String,
          default: "",
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("AboutUs", aboutUsSchema);
