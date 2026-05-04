const mongoose = require("mongoose");
const StudentProjectUniversity = require("../models/studentProjectUniversityModel");
const Project = require("../models/projectModel");
const {
  getOrCreateOthersUniversity,
  isFallbackUniversity,
} = require("../utils/studentProjectUniversityHelpers");

const normalizeName = (raw) => {
  const s = raw == null ? "" : String(raw).trim();
  if (!s) return "";
  if (s.length > 80) return null;
  return s;
};

exports.listUniversities = async (req, res) => {
  try {
    await getOrCreateOthersUniversity();
    const universities = await StudentProjectUniversity.find()
      .sort({ name: 1 })
      .lean();
    res.status(200).json({ universities });
  } catch (error) {
    console.error("listUniversities:", error);
    res.status(500).json({ message: "Server error listing universities" });
  }
};

exports.createUniversity = async (req, res) => {
  try {
    const nameNorm = normalizeName(req.body?.name);
    if (!nameNorm) {
      return res.status(400).json({
        message: "Name is required (1–80 characters)",
      });
    }

    const university = await StudentProjectUniversity.create({ name: nameNorm });
    res.status(201).json({ university });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "A university with this name already exists" });
    }
    console.error("createUniversity:", error);
    res.status(500).json({ message: "Server error creating university" });
  }
};

exports.updateUniversity = async (req, res) => {
  try {
    const { universityId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: "Invalid university id" });
    }

    const nameNorm = normalizeName(req.body?.name);
    if (!nameNorm) {
      return res.status(400).json({
        message: "Name is required (1–80 characters)",
      });
    }

    const university = await StudentProjectUniversity.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: "University not found" });
    }

    university.name = nameNorm;
    await university.save();
    res.status(200).json({ university });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "A university with this name already exists" });
    }
    console.error("updateUniversity:", error);
    res.status(500).json({ message: "Server error updating university" });
  }
};

exports.deleteUniversity = async (req, res) => {
  try {
    const { universityId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: "Invalid university id" });
    }

    const university = await StudentProjectUniversity.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: "University not found" });
    }

    if (isFallbackUniversity(university)) {
      return res.status(400).json({
        message: "The Others university cannot be deleted",
      });
    }

    const others = await getOrCreateOthersUniversity();
    if (String(others._id) === String(university._id)) {
      return res.status(400).json({
        message: "The Others university cannot be deleted",
      });
    }

    const reassigned = await Project.updateMany(
      { university: university.name },
      { $set: { "university.$": others.name } },
    );

    await StudentProjectUniversity.deleteOne({ _id: university._id });

    res.status(200).json({
      message: "University deleted",
      reassignedCount: reassigned.modifiedCount,
      fallbackUniversityId: others._id,
    });
  } catch (error) {
    console.error("deleteUniversity:", error);
    res.status(500).json({ message: "Server error deleting university" });
  }
};
