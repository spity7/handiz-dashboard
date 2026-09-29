const mongoose = require("mongoose");
const ShopCategory = require("../models/shopCategoryModel");
const ShopProduct = require("../models/shopProductModel");
const { uniqueCategorySlug } = require("../utils/shopSlug");

const normalizeName = (raw) => {
  const s = raw == null ? "" : String(raw).trim();
  if (!s || s.length > 80) return null;
  return s;
};

exports.listShopCategories = async (req, res) => {
  try {
    const categories = await ShopCategory.find()
      .sort({ order: 1, name: 1 })
      .lean();
    res.status(200).json({ categories });
  } catch (error) {
    console.error("listShopCategories:", error);
    res.status(500).json({ message: "Server error listing categories" });
  }
};

exports.createShopCategory = async (req, res) => {
  try {
    const name = normalizeName(req.body?.name);
    if (!name) {
      return res.status(400).json({ message: "Name is required (1–80 characters)" });
    }

    const slug =
      req.body?.slug?.trim() ||
      (await uniqueCategorySlug(name));

    const order =
      req.body?.order !== undefined && req.body?.order !== ""
        ? Number(req.body.order)
        : 999;

    const category = await ShopCategory.create({
      name,
      slug: String(slug).toLowerCase(),
      description: String(req.body?.description || "").trim(),
      order: Number.isFinite(order) ? order : 999,
    });

    res.status(201).json({ message: "Category created", category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Category slug already exists" });
    }
    console.error("createShopCategory:", error);
    res.status(500).json({ message: "Server error creating category" });
  }
};

exports.updateShopCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    const category = await ShopCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (req.body?.name !== undefined) {
      const name = normalizeName(req.body.name);
      if (!name) {
        return res.status(400).json({ message: "Invalid category name" });
      }
      category.name = name;
      if (!req.body?.slug) {
        category.slug = await uniqueCategorySlug(name, category._id);
      }
    }

    if (req.body?.slug !== undefined && String(req.body.slug).trim()) {
      category.slug = String(req.body.slug).trim().toLowerCase();
    }

    if (req.body?.description !== undefined) {
      category.description = String(req.body.description || "").trim();
    }

    if (req.body?.order !== undefined && req.body?.order !== "") {
      const order = Number(req.body.order);
      if (Number.isFinite(order)) category.order = order;
    }

    await category.save();
    res.status(200).json({ category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Category slug already exists" });
    }
    console.error("updateShopCategory:", error);
    res.status(500).json({ message: "Server error updating category" });
  }
};

exports.deleteShopCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    const inUse = await ShopProduct.countDocuments({
      categoryIds: categoryId,
      deletedAt: null,
    });
    if (inUse > 0) {
      return res.status(400).json({
        message: "Category is assigned to products. Reassign products first.",
      });
    }

    const deleted = await ShopCategory.findByIdAndDelete(categoryId);
    if (!deleted) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ message: "Category deleted" });
  } catch (error) {
    console.error("deleteShopCategory:", error);
    res.status(500).json({ message: "Server error deleting category" });
  }
};
