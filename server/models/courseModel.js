const mongoose = require("mongoose");
const {
  COURSE_STATUS,
  COURSE_STATUS_VALUES,
  COURSE_LEVEL,
  COURSE_LEVEL_VALUES,
  COURSE_CURRENCY,
  COURSE_DISCOUNT_TYPE,
  COURSE_DISCOUNT_TYPE_VALUES,
  MIN_PAID_COURSE_PRICE,
} = require("../constants/courseStatus");
const softDeletePlugin = require("../utils/softDeletePlugin");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
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
    thumbnailUrl: {
      type: String,
      required: [true, "Course thumbnail is required"],
      trim: true,
      validate: {
        validator: (value) => Boolean(String(value || "").trim()),
        message: "Course thumbnail is required",
      },
    },
    heroImageDesktopUrl: {
      type: String,
      trim: true,
      default: "",
    },
    heroImageMobileUrl: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: COURSE_STATUS_VALUES,
      default: COURSE_STATUS.DRAFT,
    },
    pricing: {
      isFree: { type: Boolean, default: true },
      price: { type: Number, default: 0, min: 0 },
      salePrice: { type: Number, default: 0, min: 0 },
      currency: {
        type: String,
        enum: [COURSE_CURRENCY],
        default: COURSE_CURRENCY,
      },
      discount: {
        enabled: { type: Boolean, default: false },
        type: {
          type: String,
          enum: COURSE_DISCOUNT_TYPE_VALUES,
          default: COURSE_DISCOUNT_TYPE.PERCENT,
        },
        value: { type: Number, default: 0, min: 0 },
        endsAt: { type: Date, default: null },
      },
      freeEndsAt: { type: Date, default: null },
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    level: {
      type: String,
      enum: COURSE_LEVEL_VALUES,
      default: COURSE_LEVEL.BEGINNER,
    },
    tags: [{ type: String, trim: true }],
    heroHighlights: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    order: {
      type: Number,
      default: 999,
    },
    lessonCount: {
      type: Number,
      default: 0,
    },
    totalDurationMinutes: {
      type: Number,
      default: 0,
    },
    enrollmentCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    lastPublishedAt: {
      type: Date,
      default: null,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    vdoCipherFolderId: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

courseSchema.index({ status: 1, order: 1 });
courseSchema.pre("save", function (next) {
  if (!this.pricing) return next();

  this.pricing.currency = COURSE_CURRENCY;

  if (this.pricing.isFree) {
    this.pricing.salePrice = 0;
    this.pricing.discount = {
      enabled: false,
      type: COURSE_DISCOUNT_TYPE.PERCENT,
      value: 0,
      endsAt: null,
    };
    if (!Number.isFinite(this.pricing.price) || this.pricing.price < 0) {
      this.pricing.price = 0;
    }
    return next();
  }

  this.pricing.freeEndsAt = null;

  if (!this.pricing.price || this.pricing.price < MIN_PAID_COURSE_PRICE) {
    return next(
      new Error(
        `Paid courses must have a list price of at least $${MIN_PAID_COURSE_PRICE.toFixed(2)} USD.`,
      ),
    );
  }

  const {
    computeSalePrice,
    getEffectiveDiscount,
  } = require("../utils/coursePricing");
  const effectiveDiscount = getEffectiveDiscount(this.pricing.discount);
  const salePrice = effectiveDiscount.enabled
    ? computeSalePrice(this.pricing.price, effectiveDiscount)
    : this.pricing.price;

  if (!Number.isFinite(salePrice) || salePrice < MIN_PAID_COURSE_PRICE) {
    return next(
      new Error(
        `Discount is too large. Minimum checkout price is $${MIN_PAID_COURSE_PRICE.toFixed(2)} USD.`,
      ),
    );
  }

  this.pricing.salePrice = salePrice;
  next();
});
courseSchema.plugin(softDeletePlugin);

module.exports = mongoose.model("Course", courseSchema);
