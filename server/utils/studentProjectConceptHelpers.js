const StudentProjectConcept = require("../models/studentProjectConceptModel");

const OTHERS_CONCEPT_NAME = "Others";

/**
 * Returns the fallback concept used when a concept is deleted.
 * Creates it on first use if missing.
 */
async function getOrCreateOthersConcept() {
  let doc = await StudentProjectConcept.findOne({ isFallback: true });
  if (doc) return doc;

  doc = await StudentProjectConcept.findOne({
    name: new RegExp(`^${OTHERS_CONCEPT_NAME}$`, "i"),
  });
  if (doc) {
    if (!doc.isFallback) {
      doc.isFallback = true;
      await doc.save();
    }
    return doc;
  }

  return StudentProjectConcept.create({
    name: OTHERS_CONCEPT_NAME,
    isFallback: true,
  });
}

function isFallbackConcept(doc) {
  return Boolean(doc && doc.isFallback);
}

module.exports = {
  OTHERS_CONCEPT_NAME,
  getOrCreateOthersConcept,
  isFallbackConcept,
};
