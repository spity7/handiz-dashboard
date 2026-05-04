const mongoose = require("mongoose");
const StudentProjectType = require("../models/studentProjectTypeModel");
const Project = require("../models/projectModel");
const {
  getOrCreateOthersType,
  isFallbackType,
} = require("../utils/studentProjectTypeHelpers");

const normalizeName = (raw) => {
  const s = raw == null ? "" : String(raw).trim();
  if (!s) return "";
  if (s.length > 80) return null;
  return s;
};

exports.listTypes = async (req, res) => {
  try {
    await getOrCreateOthersType();
    const types = await StudentProjectType.find()
      .sort({ name: 1 })
      .lean();
    res.status(200).json({ types });
  } catch (error) {
    console.error("listTypes:", error);
    res.status(500).json({ message: "Server error listing types" });
  }
};

exports.createType = async (req, res) => {
  try {
    const nameNorm = normalizeName(req.body?.name);
    if (!nameNorm) {
      return res.status(400).json({
        message: "Name is required (1–80 characters)",
      });
    }

    const type = await StudentProjectType.create({ name: nameNorm });
    res.status(201).json({ type });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "A type with this name already exists" });
    }
    console.error("createType:", error);
    res.status(500).json({ message: "Server error creating type" });
  }
};

exports.updateType = async (req, res) => {
  try {
    const { typeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(typeId)) {
      return res.status(400).json({ message: "Invalid type id" });
    }

    const nameNorm = normalizeName(req.body?.name);
    if (!nameNorm) {
      return res.status(400).json({
        message: "Name is required (1–80 characters)",
      });
    }

    const type = await StudentProjectType.findById(typeId);
    if (!type) {
      return res.status(404).json({ message: "Type not found" });
    }

    type.name = nameNorm;
    await type.save();
    res.status(200).json({ type });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "A type with this name already exists" });
    }
    console.error("updateType:", error);
    res.status(500).json({ message: "Server error updating type" });
  }
};

exports.deleteType = async (req, res) => {
  try {
    const { typeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(typeId)) {
      return res.status(400).json({ message: "Invalid type id" });
    }

    const type = await StudentProjectType.findById(typeId);
    if (!type) {
      return res.status(404).json({ message: "Type not found" });
    }

    if (isFallbackType(type)) {
      return res.status(400).json({
        message: "The Others type cannot be deleted",
      });
    }

    const others = await getOrCreateOthersType();
    if (String(others._id) === String(type._id)) {
      return res.status(400).json({
        message: "The Others type cannot be deleted",
      });
    }

    // Replace the deleted type with "Others" in all projects
    // Note: The field 'type' in projectModel is an array of strings.
    // We need to update any project that has this type name in its type array.
    const reassigned = await Project.updateMany(
      { type: type.name },
      { $set: { "type.$": others.name } },
    );

    await StudentProjectType.deleteOne({ _id: type._id });

    res.status(200).json({
      message: "Type deleted",
      reassignedCount: reassigned.modifiedCount,
      fallbackTypeId: others._id,
    });
  } catch (error) {
    console.error("deleteType:", error);
    res.status(500).json({ message: "Server error deleting type" });
  }
};
