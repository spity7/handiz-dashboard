const ShopProduct = require("../models/shopProductModel");
const ShopCategory = require("../models/shopCategoryModel");
const { generateUniqueSlug } = require("./courseHelpers");

const uniqueProductSlug = (base, excludeId = null) =>
  generateUniqueSlug(ShopProduct, base, excludeId);

const uniqueCategorySlug = (base, excludeId = null) =>
  generateUniqueSlug(ShopCategory, base, excludeId);

module.exports = { uniqueProductSlug, uniqueCategorySlug };
