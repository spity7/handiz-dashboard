const mongoose = require("mongoose");

const shopCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [80, "Name must be at most 80 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    order: {
      type: Number,
      default: 999,
    },
  },
  { timestamps: true },
);

shopCategorySchema.index({ slug: 1 }, { unique: true });
shopCategorySchema.index({ order: 1, name: 1 });

module.exports = mongoose.model("ShopCategory", shopCategorySchema);
