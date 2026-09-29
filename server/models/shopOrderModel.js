const mongoose = require("mongoose");
const {
  SHOP_CURRENCY,
  SHOP_PAYMENT_STATUS,
  SHOP_PAYMENT_STATUS_VALUES,
  SHOP_FULFILLMENT_STATUS,
  SHOP_FULFILLMENT_STATUS_VALUES,
} = require("../constants/shopStatus");

const shopOrderLineSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShopProduct",
      required: true,
    },
    sku: { type: String, default: "" },
    title: { type: String, required: true },
    thumbnailUrl: { type: String, default: "" },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    governorate: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    building: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    byUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const shopOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: {
      type: [shopOrderLineSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "Order must have at least one item",
      },
    },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      enum: [SHOP_CURRENCY],
      default: SHOP_CURRENCY,
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    paymentProvider: {
      type: String,
      enum: ["whish"],
      default: "whish",
    },
    whishExternalId: {
      type: String,
      default: "",
      index: true,
    },
    whishTransactionId: {
      type: String,
      default: "",
    },
    paymentStatus: {
      type: String,
      enum: SHOP_PAYMENT_STATUS_VALUES,
      default: SHOP_PAYMENT_STATUS.PENDING,
    },
    fulfillmentStatus: {
      type: String,
      enum: SHOP_FULFILLMENT_STATUS_VALUES,
      default: SHOP_FULFILLMENT_STATUS.PENDING,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    paidAt: { type: Date, default: null },
    failureReason: { type: String, default: "" },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

shopOrderSchema.index({ createdAt: -1 });
shopOrderSchema.index({ paymentStatus: 1, fulfillmentStatus: 1 });

module.exports = mongoose.model("ShopOrder", shopOrderSchema);
