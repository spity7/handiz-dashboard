const mongoose = require("mongoose");
const StudentProjectConcept = require("../models/studentProjectConceptModel");
const Project = require("../models/projectModel");
const {
  getOrCreateOthersConcept,
  isFallbackConcept,
} = require("../utils/studentProjectConceptHelpers");

const normalizeName = (raw) => {
  const s = raw == null ? "" : String(raw).trim();
  if (!s) return "";
  if (s.length > 80) return null;
  return s;
};

exports.listConcepts = async (req, res) => {
  try {
    await getOrCreateOthersConcept();
    const concepts = await StudentProjectConcept.find()
      .sort({ name: 1 })
      .lean();
    res.status(200).json({ concepts });
  } catch (error) {
    console.error("listConcepts:", error);
    res.status(500).json({ message: "Server error listing concepts" });
  }
};

exports.createConcept = async (req, res) => {
  try {
    const nameNorm = normalizeName(req.body?.name);
    if (!nameNorm) {
      return res.status(400).json({
        message: "Name is required (1–80 characters)",
      });
    }

    const concept = await StudentProjectConcept.create({ name: nameNorm });
    res.status(201).json({ concept });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "A concept with this name already exists" });
    }
    console.error("createConcept:", error);
    res.status(500).json({ message: "Server error creating concept" });
  }
};

exports.updateConcept = async (req, res) => {
  try {
    const { conceptId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conceptId)) {
      return res.status(400).json({ message: "Invalid concept id" });
    }

    const nameNorm = normalizeName(req.body?.name);
    if (!nameNorm) {
      return res.status(400).json({
        message: "Name is required (1–80 characters)",
      });
    }

    const concept = await StudentProjectConcept.findById(conceptId);
    if (!concept) {
      return res.status(404).json({ message: "Concept not found" });
    }

    concept.name = nameNorm;
    await concept.save();
    res.status(200).json({ concept });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "A concept with this name already exists" });
    }
    console.error("updateConcept:", error);
    res.status(500).json({ message: "Server error updating concept" });
  }
};

exports.deleteConcept = async (req, res) => {
  try {
    const { conceptId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conceptId)) {
      return res.status(400).json({ message: "Invalid concept id" });
    }

    const concept = await StudentProjectConcept.findById(conceptId);
    if (!concept) {
      return res.status(404).json({ message: "Concept not found" });
    }

    if (isFallbackConcept(concept)) {
      return res.status(400).json({
        message: "The Others concept cannot be deleted",
      });
    }

    const others = await getOrCreateOthersConcept();
    if (String(others._id) === String(concept._id)) {
      return res.status(400).json({
        message: "The Others concept cannot be deleted",
      });
    }

    // Replace the deleted concept with "Others" in all projects
    const reassigned = await Project.updateMany(
      { concept: concept.name },
      { $set: { "concept.$": others.name } },
    );

    await StudentProjectConcept.deleteOne({ _id: concept._id });

    res.status(200).json({
      message: "Concept deleted",
      reassignedCount: reassigned.modifiedCount,
      fallbackConceptId: others._id,
    });
  } catch (error) {
    console.error("deleteConcept:", error);
    res.status(500).json({ message: "Server error deleting concept" });
  }
};
