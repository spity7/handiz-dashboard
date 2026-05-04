const StudentProjectCategory = require("../models/studentProjectCategoryModel");

const OTHERS_CATEGORY_NAME = "Others";

async function getOrCreateOthersCategory() {
  let doc = await StudentProjectCategory.findOne({ isFallback: true });
  if (doc) return doc;

  doc = await StudentProjectCategory.findOne({
    name: new RegExp(`^${OTHERS_CATEGORY_NAME}$`, "i"),
  });
  if (doc) {
    if (!doc.isFallback) {
      doc.isFallback = true;
      await doc.save();
    }
    return doc;
  }

  return StudentProjectCategory.create({
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
