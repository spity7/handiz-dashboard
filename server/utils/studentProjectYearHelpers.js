const StudentProjectYear = require("../models/studentProjectYearModel");

const OTHERS_YEAR_NAME = "Others";

async function getOrCreateOthersYear() {
  let doc = await StudentProjectYear.findOne({ isFallback: true });
  if (doc) return doc;

  doc = await StudentProjectYear.findOne({
    name: new RegExp(`^${OTHERS_YEAR_NAME}$`, "i"),
  });
  if (doc) {
    if (!doc.isFallback) {
      doc.isFallback = true;
      await doc.save();
    }
    return doc;
  }

  return StudentProjectYear.create({
    name: OTHERS_YEAR_NAME,
    isFallback: true,
  });
}

function isFallbackYear(doc) {
  return Boolean(doc && doc.isFallback);
}

module.exports = {
  OTHERS_YEAR_NAME,
  getOrCreateOthersYear,
  isFallbackYear,
};
