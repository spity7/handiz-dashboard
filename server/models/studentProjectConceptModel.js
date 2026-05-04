const mongoose = require("mongoose");

const studentProjectConceptSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Concept name is required"],
      trim: true,
      maxlength: [80, "Name must be at most 80 characters"],
    },
    /** Single system bucket: concepts are moved here when their concept is deleted */
    isFallback: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

studentProjectConceptSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model(
  "StudentProjectConcept",
  studentProjectConceptSchema,
);
