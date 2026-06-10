const mongoose = require("mongoose");

const userActionRequestSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: ["update", "delete"],
      required: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewNote: { type: String, default: "" },
    executedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userActionRequestSchema.index(
  { targetUserId: 1, action: 1, status: 1 },
  { partialFilterExpression: { status: "pending" } },
);

module.exports = mongoose.model("UserActionRequest", userActionRequestSchema);
