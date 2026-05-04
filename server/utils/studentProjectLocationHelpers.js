const StudentProjectLocation = require("../models/studentProjectLocationModel");

const OTHERS_LOCATION_NAME = "Others";

async function getOrCreateOthersLocation() {
  let doc = await StudentProjectLocation.findOne({ isFallback: true });
  if (doc) return doc;

  doc = await StudentProjectLocation.findOne({
    name: new RegExp(`^${OTHERS_LOCATION_NAME}$`, "i"),
  });
  if (doc) {
    if (!doc.isFallback) {
      doc.isFallback = true;
      await doc.save();
    }
    return doc;
  }

  return StudentProjectLocation.create({
    name: OTHERS_LOCATION_NAME,
    isFallback: true,
  });
}

function isFallbackLocation(doc) {
  return Boolean(doc && doc.isFallback);
}

module.exports = {
  OTHERS_LOCATION_NAME,
  getOrCreateOthersLocation,
  isFallbackLocation,
};
