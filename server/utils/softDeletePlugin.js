/**
 * Mongoose plugin that adds soft-delete support via a `deletedAt` field.
 * Active records have `deletedAt: null` and are included in queries by default.
 * Pass `{ includeDeleted: true }` in query options to include soft-deleted records.
 */
function softDeletePlugin(schema) {
  schema.add({
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  });

  const excludeDeleted = function excludeDeleted(next) {
    if (this.getOptions().includeDeleted) {
      return next();
    }
    this.where({ deletedAt: null });
    next();
  };

  schema.pre("find", excludeDeleted);
  schema.pre("findOne", excludeDeleted);
  schema.pre("findOneAndUpdate", excludeDeleted);
  schema.pre("countDocuments", excludeDeleted);
  schema.pre("distinct", excludeDeleted);
  schema.pre("updateMany", excludeDeleted);
  schema.pre("updateOne", excludeDeleted);

  schema.methods.softDelete = async function softDelete() {
    this.deletedAt = new Date();
    return this.save();
  };

  schema.methods.restore = async function restore() {
    this.deletedAt = null;
    return this.save();
  };

  schema.statics.findWithDeleted = function findWithDeleted(filter = {}) {
    return this.find(filter).setOptions({ includeDeleted: true });
  };

  schema.statics.findOneWithDeleted = function findOneWithDeleted(filter = {}) {
    return this.findOne(filter).setOptions({ includeDeleted: true });
  };
}

module.exports = softDeletePlugin;
