const StudentProjectUniversity = require("../models/studentProjectUniversityModel");

const OTHERS_UNIVERSITY_NAME = "Others";

async function getOrCreateOthersUniversity() {
  let doc = await StudentProjectUniversity.findOne({ isFallback: true });
  if (doc) return doc;

  doc = await StudentProjectUniversity.findOne({
    name: new RegExp(`^${OTHERS_UNIVERSITY_NAME}$`, "i"),
  });
  if (doc) {
    if (!doc.isFallback) {
      doc.isFallback = true;
      await doc.save();
    }
    return doc;
  }

  return StudentProjectUniversity.create({
    name: OTHERS_UNIVERSITY_NAME,
    isFallback: true,
  });
}

function isFallbackUniversity(doc) {
  return Boolean(doc && doc.isFallback);
}

module.exports = {
  OTHERS_UNIVERSITY_NAME,
  getOrCreateOthersUniversity,
  isFallbackUniversity,
};
