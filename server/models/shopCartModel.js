const mongoose = require("mongoose");
const {
  MAX_CART_LINE_ITEMS,
  MAX_LINE_QUANTITY,
  CART_TTL_SECONDS,
} = require("../constants/shopCart");

const shopCartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShopProduct",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_LINE_QUANTITY,
    },
  },
  { _id: false },
);

const shopCartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [shopCartItemSchema],
      default: [],
      validate: {
        validator: (v) => v.length <= MAX_CART_LINE_ITEMS,
        message: `Cart cannot exceed ${MAX_CART_LINE_ITEMS} distinct products`,
      },
    },
  },
  { timestamps: true },
);

shopCartSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: CART_TTL_SECONDS },
);

module.exports = mongoose.model("ShopCart", shopCartSchema);
