const mongoose = require("mongoose");
const StudentProjectYear = require("../models/studentProjectYearModel");
const Project = require("../models/projectModel");
const {
  getOrCreateOthersYear,
  isFallbackYear,
} = require("../utils/studentProjectYearHelpers");

const normalizeName = (raw) => {
  const s = raw == null ? "" : String(raw).trim();
  if (!s) return "";
  if (s.length > 80) return null;
  return s;
};

exports.listYears = async (req, res) => {
  try {
    await getOrCreateOthersYear();
    const years = await StudentProjectYear.find().sort({ name: 1 }).lean();
    res.status(200).json({ years });
  } catch (error) {
    console.error("listYears:", error);
    res.status(500).json({ message: "Server error listing years" });
  }
};

exports.createYear = async (req, res) => {
  try {
    const nameNorm = normalizeName(req.body?.name);
    if (!nameNorm) {
      return res.status(400).json({
        message: "Name is required (1–80 characters)",
      });
    }

    const year = await StudentProjectYear.create({ name: nameNorm });
    res.status(201).json({ year });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "A year with this name already exists" });
    }
    console.error("createYear:", error);
    res.status(500).json({ message: "Server error creating year" });
  }
};

exports.updateYear = async (req, res) => {
  try {
    const { yearId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(yearId)) {
      return res.status(400).json({ message: "Invalid year id" });
    }

    const nameNorm = normalizeName(req.body?.name);
    if (!nameNorm) {
      return res.status(400).json({
        message: "Name is required (1–80 characters)",
      });
    }

    const year = await StudentProjectYear.findById(yearId);
    if (!year) {
      return res.status(404).json({ message: "Year not found" });
    }

    const oldName = year.name;

    // Only update projects if the name actually changed
    if (oldName !== nameNorm) {
      // Update all projects that reference the old year name
      const updatedProjects = await Project.updateMany(
        { year: oldName },
        { $set: { "year.$": nameNorm } },
      );

      year.name = nameNorm;
      await year.save();

      res.status(200).json({
        year,
        updatedProjectsCount: updatedProjects.modifiedCount,
      });
    } else {
      // No change needed
      res.status(200).json({ year, updatedProjectsCount: 0 });
    }
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "A year with this name already exists" });
    }
    console.error("updateYear:", error);
    res.status(500).json({ message: "Server error updating year" });
  }
};

exports.deleteYear = async (req, res) => {
  try {
    const { yearId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(yearId)) {
      return res.status(400).json({ message: "Invalid year id" });
    }

    const year = await StudentProjectYear.findById(yearId);
    if (!year) {
      return res.status(404).json({ message: "Year not found" });
    }

    if (isFallbackYear(year)) {
      return res.status(400).json({
        message: "The Others year cannot be deleted",
      });
    }

    const others = await getOrCreateOthersYear();
    if (String(others._id) === String(year._id)) {
      return res.status(400).json({
        message: "The Others year cannot be deleted",
      });
    }

    const reassigned = await Project.updateMany(
      { year: year.name },
      { $set: { "year.$": others.name } },
    );

    await StudentProjectYear.deleteOne({ _id: year._id });

    res.status(200).json({
      message: "Year deleted",
      reassignedCount: reassigned.modifiedCount,
      fallbackYearId: others._id,
    });
  } catch (error) {
    console.error("deleteYear:", error);
    res.status(500).json({ message: "Server error deleting year" });
  }
};
