const mongoose = require("mongoose");
const StudentProjectLocation = require("../models/studentProjectLocationModel");
const Project = require("../models/projectModel");
const {
  getOrCreateOthersLocation,
  isFallbackLocation,
} = require("../utils/studentProjectLocationHelpers");

const normalizeName = (raw) => {
  const s = raw == null ? "" : String(raw).trim();
  if (!s) return "";
  if (s.length > 80) return null;
  return s;
};

exports.listLocations = async (req, res) => {
  try {
    await getOrCreateOthersLocation();
    const locations = await StudentProjectLocation.find()
      .sort({ name: 1 })
      .lean();
    res.status(200).json({ locations });
  } catch (error) {
    console.error("listLocations:", error);
    res.status(500).json({ message: "Server error listing locations" });
  }
};

exports.createLocation = async (req, res) => {
  try {
    const nameNorm = normalizeName(req.body?.name);
    if (!nameNorm) {
      return res.status(400).json({
        message: "Name is required (1–80 characters)",
      });
    }

    const location = await StudentProjectLocation.create({ name: nameNorm });
    res.status(201).json({ location });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "A location with this name already exists" });
    }
    console.error("createLocation:", error);
    res.status(500).json({ message: "Server error creating location" });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { locationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return res.status(400).json({ message: "Invalid location id" });
    }

    const nameNorm = normalizeName(req.body?.name);
    if (!nameNorm) {
      return res.status(400).json({
        message: "Name is required (1–80 characters)",
      });
    }

    const location = await StudentProjectLocation.findById(locationId);
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    location.name = nameNorm;
    await location.save();
    res.status(200).json({ location });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "A location with this name already exists" });
    }
    console.error("updateLocation:", error);
    res.status(500).json({ message: "Server error updating location" });
  }
};

exports.deleteLocation = async (req, res) => {
  try {
    const { locationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return res.status(400).json({ message: "Invalid location id" });
    }

    const location = await StudentProjectLocation.findById(locationId);
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    if (isFallbackLocation(location)) {
      return res.status(400).json({
        message: "The Others location cannot be deleted",
      });
    }

    const others = await getOrCreateOthersLocation();
    if (String(others._id) === String(location._id)) {
      return res.status(400).json({
        message: "The Others location cannot be deleted",
      });
    }

    const reassigned = await Project.updateMany(
      { location: location.name },
      { $set: { "location.$": others.name } },
    );

    await StudentProjectLocation.deleteOne({ _id: location._id });

    res.status(200).json({
      message: "Location deleted",
      reassignedCount: reassigned.modifiedCount,
      fallbackLocationId: others._id,
    });
  } catch (error) {
    console.error("deleteLocation:", error);
    res.status(500).json({ message: "Server error deleting location" });
  }
};
