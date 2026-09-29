const mongoose = require("mongoose");
const {
  SHOP_PRODUCT_STATUS,
  SHOP_PRODUCT_STATUS_VALUES,
  SHOP_CURRENCY,
  SHOP_DISCOUNT_TYPE,
  SHOP_DISCOUNT_TYPE_VALUES,
} = require("../constants/shopStatus");
const softDeletePlugin = require("../utils/softDeletePlugin");

const shopProductSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    sku: {
      type: String,
      trim: true,
      default: "",
    },
    excerpt: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: SHOP_PRODUCT_STATUS_VALUES,
      default: SHOP_PRODUCT_STATUS.DRAFT,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 999,
    },
    categoryIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ShopCategory",
      },
    ],
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    salePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      enum: [SHOP_CURRENCY],
      default: SHOP_CURRENCY,
    },
    discount: {
      enabled: { type: Boolean, default: false },
      type: {
        type: String,
        enum: SHOP_DISCOUNT_TYPE_VALUES,
        default: SHOP_DISCOUNT_TYPE.PERCENT,
      },
      value: { type: Number, default: 0, min: 0 },
      endsAt: { type: Date, default: null },
    },
    thumbnailUrl: {
      type: String,
      required: [true, "Thumbnail image URL is required"],
      trim: true,
    },
    gallery: {
      type: [String],
      default: [],
    },
    trackInventory: {
      type: Boolean,
      default: true,
    },
    stockQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
  },
  { timestamps: true },
);

shopProductSchema.index({ slug: 1 }, { unique: true });
shopProductSchema.index(
  { sku: 1 },
  {
    unique: true,
    partialFilterExpression: { sku: { $type: "string", $ne: "" } },
  },
);
shopProductSchema.index({ status: 1, featured: -1, sortOrder: 1 });
shopProductSchema.index({ categoryIds: 1 });
shopProductSchema.index({ title: "text", excerpt: "text" });

shopProductSchema.plugin(softDeletePlugin);

module.exports = mongoose.model("ShopProduct", shopProductSchema);
