const AiPromptCategory = require("../models/aiPromptCategoryModel");

const OTHERS_CATEGORY_NAME = "Others";

/**
 * Returns the fallback category used when a category is deleted.
 * Creates it on first use if missing.
 */
async function getOrCreateOthersCategory() {
  let doc = await AiPromptCategory.findOne({ isFallback: true });
  if (doc) return doc;

  doc = await AiPromptCategory.findOne({
    name: new RegExp(`^${OTHERS_CATEGORY_NAME}$`, "i"),
  });
  if (doc) {
    if (!doc.isFallback) {
      doc.isFallback = true;
      await doc.save();
    }
    return doc;
  }

  return AiPromptCategory.create({
    name: OTHERS_CATEGORY_NAME,
    isFallback: true,
  });
}

function isFallbackCategory(doc) {
  return Boolean(doc && doc.isFallback);
}

module.exports = {
  OTHERS_CATEGORY_NAME,
  getOrCreateOthersCategory,
  isFallbackCategory,
};
