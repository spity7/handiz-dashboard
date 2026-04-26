const mongoose = require("mongoose");

const aiPromptCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [80, "Name must be at most 80 characters"],
    },
    /** Single system bucket: prompts are moved here when their category is deleted */
    isFallback: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

aiPromptCategorySchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("AiPromptCategory", aiPromptCategorySchema);
