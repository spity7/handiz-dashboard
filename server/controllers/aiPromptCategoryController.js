const mongoose = require("mongoose");
const AiPromptCategory = require("../models/aiPromptCategoryModel");
const AiTool = require("../models/aiToolModel");
const {
  getOrCreateOthersCategory,
  isFallbackCategory,
} = require("../utils/aiPromptCategoryHelpers");

const normalizeName = (raw) => {
  const s = raw == null ? "" : String(raw).trim();
  if (!s) return "";
  if (s.length > 80) return null;
  return s;
};

exports.listCategories = async (req, res) => {
  try {
    await getOrCreateOthersCategory();
    const categories = await AiPromptCategory.find().sort({ name: 1 }).lean();
    res.status(200).json({ categories });
  } catch (error) {
    console.error("listCategories:", error);
    res.status(500).json({ message: "Server error listing categories" });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const nameNorm = normalizeName(req.body?.name);
    if (!nameNorm) {
      return res.status(400).json({
        message: "Name is required (1–80 characters)",
      });
    }

    const category = await AiPromptCategory.create({ name: nameNorm });
    res.status(201).json({ category });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "A category with this name already exists" });
    }
    console.error("createCategory:", error);
    res.status(500).json({ message: "Server error creating category" });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    const nameNorm = normalizeName(req.body?.name);
    if (!nameNorm) {
      return res.status(400).json({
        message: "Name is required (1–80 characters)",
      });
    }

    const category = await AiPromptCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    category.name = nameNorm;
    await category.save();
    res.status(200).json({ category });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "A category with this name already exists" });
    }
    console.error("updateCategory:", error);
    res.status(500).json({ message: "Server error updating category" });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    const category = await AiPromptCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (isFallbackCategory(category)) {
      return res.status(400).json({
        message: "The Others category cannot be deleted",
      });
    }

    const others = await getOrCreateOthersCategory();
    if (String(others._id) === String(category._id)) {
      return res.status(400).json({
        message: "The Others category cannot be deleted",
      });
    }

    const reassigned = await AiTool.updateMany(
      { category: category._id },
      { $set: { category: others._id } },
    );

    await AiPromptCategory.deleteOne({ _id: category._id });

    res.status(200).json({
      message: "Category deleted",
      reassignedCount: reassigned.modifiedCount,
      fallbackCategoryId: others._id,
    });
  } catch (error) {
    console.error("deleteCategory:", error);
    res.status(500).json({ message: "Server error deleting category" });
  }
};
