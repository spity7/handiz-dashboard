const StudentProjectType = require("../models/studentProjectTypeModel");

const OTHERS_TYPE_NAME = "Others";

/**
 * Returns the fallback type used when a type is deleted.
 * Creates it on first use if missing.
 */
async function getOrCreateOthersType() {
  let doc = await StudentProjectType.findOne({ isFallback: true });
  if (doc) return doc;

  doc = await StudentProjectType.findOne({
    name: new RegExp(`^${OTHERS_TYPE_NAME}$`, "i"),
  });
  if (doc) {
    if (!doc.isFallback) {
      doc.isFallback = true;
      await doc.save();
    }
    return doc;
  }

  return StudentProjectType.create({
    name: OTHERS_TYPE_NAME,
    isFallback: true,
  });
}

function isFallbackType(doc) {
  return Boolean(doc && doc.isFallback);
}

module.exports = {
  OTHERS_TYPE_NAME,
  getOrCreateOthersType,
  isFallbackType,
};
