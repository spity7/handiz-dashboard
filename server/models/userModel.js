const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const softDeletePlugin = require("../utils/softDeletePlugin");

const userSchema = mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
      trim: true,
    },
    lastname: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      validate: [validator.isEmail, "Please enter a valid email address."],
    },
    password: {
      type: String,
      minLength: [8, "Password must be at least 8 characters long."],
      required: function requiredPassword() {
        return !this.googleId;
      },
    },
    googleId: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      required: true,
      enum: ["Admin", "Editor", "User"],
      default: "User",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
    },
    verificationTokenExpiry: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    mobileCountryCode: {
      type: String,
      default: null,
      trim: true,
    },
    mobileNumber: {
      type: String,
      default: null,
      trim: true,
    },
    instagramUrl: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.plugin(softDeletePlugin);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index(
  { googleId: 1 },
  {
    unique: true,
    partialFilterExpression: { googleId: { $type: "string" } },
  },
);

// Pre-save Hook to hash password
userSchema.pre("save", async function (next) {
  try {
    if (this.isModified("password") || this.isNew) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      if (!this.isNew) {
        this.passwordChangedAt = new Date();
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Method for comparing passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed.");
  }
};

module.exports = mongoose.model("User", userSchema);
