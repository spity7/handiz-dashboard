const mongoose = require("mongoose");
const {
  ORDER_STATUS,
  ORDER_STATUS_VALUES,
} = require("../constants/enrollmentStatus");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    paymentProvider: {
      type: String,
      enum: ["whish", "stripe"],
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
    stripeSessionId: {
      type: String,
      default: "",
      index: true,
    },
    stripePaymentIntentId: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["USD"],
      default: "USD",
    },
    status: {
      type: String,
      enum: ORDER_STATUS_VALUES,
      default: ORDER_STATUS.PENDING,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);
