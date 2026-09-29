const mongoose = require("mongoose");
const ShopProduct = require("../models/shopProductModel");
const ShopCategory = require("../models/shopCategoryModel");
const { uploadOptimizedImage, deleteImage } = require("../utils/gcs");
const { getImageValidationError } = require("../utils/imageValidation");
const { parseBooleanField } = require("../utils/coursePricing");
const {
  SHOP_PRODUCT_STATUS,
  SHOP_PRODUCT_STATUS_VALUES,
} = require("../constants/shopStatus");
const { uniqueProductSlug } = require("../utils/shopSlug");
const {
  getProductUnitPrice,
  resolveProductPricing,
} = require("../utils/shopPricing");
const { hasPermission } = require("../constants/permissions");
const { isProductPurchasable } = require("../utils/shopInventory");

const POPULATE_CATEGORIES = {
  path: "categoryIds",
  select: "name slug",
};

const parseCategoryIds = async (raw) => {
  if (raw === undefined || raw === null || raw === "") return [];
  let ids = raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      ids = Array.isArray(parsed) ? parsed : raw.split(",");
    } catch {
      ids = raw.split(",");
    }
  }
  if (!Array.isArray(ids)) return [];
  const valid = [];
  for (const id of ids) {
    const s = String(id).trim();
    if (!mongoose.Types.ObjectId.isValid(s)) continue;
    const exists = await ShopCategory.exists({ _id: s });
    if (exists) valid.push(s);
  }
  return valid;
};

const canManageShop = (user) =>
  user && hasPermission(user.role, "shop:manage");

const serializeProduct = (product) => {
  const plain =
    typeof product.toObject === "function"
      ? product.toObject({ virtuals: true })
      : { ...product };
  const pricing = resolveProductPricing(plain);
  return {
    ...plain,
    unitPrice: pricing.unitPrice,
    listPrice: pricing.listPrice,
  };
};

const buildPublicProductQuery = (req) => {
  const q = { deletedAt: null };
  if (!canManageShop(req.user)) {
    q.status = SHOP_PRODUCT_STATUS.PUBLISHED;
  }
  return q;
};

exports.createShopProduct = async (req, res) => {
  try {
    const {
      title,
      slug,
      sku,
      excerpt,
      description,
      status,
      price,
      salePrice,
      featured,
      sortOrder,
      trackInventory,
      stockQuantity,
      lowStockThreshold,
    } = req.body;

    const thumbnailFile = req.files?.thumbnail?.[0];
    const galleryFiles = req.files?.gallery || [];

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const listPrice = Number(price);
    if (!Number.isFinite(listPrice) || listPrice < 0) {
      return res.status(400).json({ message: "Valid price is required" });
    }

    if (!thumbnailFile) {
      return res.status(400).json({ message: "Thumbnail image is required" });
    }

    const thumbnailTypeError = getImageValidationError(thumbnailFile);
    if (thumbnailTypeError) {
      return res.status(400).json({ message: thumbnailTypeError });
    }

    const productSlug =
      slug?.trim() ||
      (await uniqueProductSlug(String(title).trim()));

    const categoryIds = await parseCategoryIds(req.body.categoryIds);

    const uploadStamp = Date.now();
    const thumbnailUrl = await uploadOptimizedImage(
      thumbnailFile.buffer,
      thumbnailFile.originalname,
      "shopProducts/thumbnails",
      { stamp: uploadStamp },
    );

    let galleryUrls = [];
    if (galleryFiles.length > 0) {
      galleryUrls = await Promise.all(
        galleryFiles.map((file, index) => {
          const err = getImageValidationError(file);
          if (err) throw new Error(err);
          return uploadOptimizedImage(
            file.buffer,
            file.originalname,
            "shopProducts/gallery",
            { stamp: uploadStamp, index },
          );
        }),
      );
    }

    let productStatus = SHOP_PRODUCT_STATUS.DRAFT;
    if (status && SHOP_PRODUCT_STATUS_VALUES.includes(status)) {
      productStatus = status;
    }

    const product = await ShopProduct.create({
      title: String(title).trim(),
      slug: String(productSlug).toLowerCase(),
      sku: String(sku || "").trim(),
      excerpt: String(excerpt || "").trim(),
      description: String(description || ""),
      status: productStatus,
      featured: parseBooleanField(featured, false),
      sortOrder:
        sortOrder !== undefined && sortOrder !== ""
          ? Number(sortOrder) || 999
          : 999,
      categoryIds,
      price: listPrice,
      salePrice:
        salePrice !== undefined && salePrice !== ""
          ? Math.max(0, Number(salePrice) || 0)
          : 0,
      discount: {
        enabled: parseBooleanField(req.body.discountEnabled, false),
        type: req.body.discountType || "percent",
        value: Number(req.body.discountValue) || 0,
        endsAt: req.body.discountEndsAt || null,
      },
      thumbnailUrl,
      gallery: galleryUrls,
      trackInventory: parseBooleanField(trackInventory, true),
      stockQuantity:
        stockQuantity !== undefined && stockQuantity !== ""
          ? Math.max(0, Number(stockQuantity) || 0)
          : 0,
      lowStockThreshold:
        lowStockThreshold !== undefined && lowStockThreshold !== ""
          ? Math.max(0, Number(lowStockThreshold) || 5)
          : 5,
    });

    await product.populate(POPULATE_CATEGORIES);

    res.status(201).json({
      message: "Product created",
      product: serializeProduct(product),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Slug or SKU already exists" });
    }
    console.error("createShopProduct:", error);
    res.status(500).json({
      message: error.message || "Server error creating product",
    });
  }
};

exports.getShopProducts = async (req, res) => {
  try {
    const isAdminList =
      req.query.admin === "true" && canManageShop(req.user);

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 12));
    const skip = (page - 1) * limit;

    const filter = buildPublicProductQuery(req);

    if (req.query.featured === "true") {
      filter.featured = true;
    }

    if (req.query.category) {
      const catSlug = String(req.query.category).trim().toLowerCase();
      const cat = await ShopCategory.findOne({ slug: catSlug }).lean();
      if (cat) {
        filter.categoryIds = cat._id;
      } else {
        return res.status(200).json({
          products: [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      }
    }

    if (req.query.q) {
      filter.$text = { $search: String(req.query.q).trim() };
    }

    let sort = { sortOrder: 1, createdAt: -1 };
    const sortParam = String(req.query.sort || "").toLowerCase();
    if (sortParam === "price_asc") sort = { price: 1 };
    if (sortParam === "price_desc") sort = { price: -1 };
    if (sortParam === "newest") sort = { createdAt: -1 };

    const query = ShopProduct.find(filter).populate(POPULATE_CATEGORIES);

    if (isAdminList) {
      const products = await query.sort(sort).lean();
      return res.status(200).json({
        products: products.map((p) => serializeProduct(p)),
      });
    }

    const [total, products] = await Promise.all([
      ShopProduct.countDocuments(filter),
      query.sort(sort).skip(skip).limit(limit).lean(),
    ]);

    res.status(200).json({
      products: products.map((p) => serializeProduct(p)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 0,
      },
      shippingFee: require("../utils/shopPricing").getShippingFee(),
    });
  } catch (error) {
    console.error("getShopProducts:", error);
    res.status(500).json({ message: "Server error fetching products" });
  }
};

exports.getShopProductBySlug = async (req, res) => {
  try {
    const filter = buildPublicProductQuery(req);
    filter.slug = String(req.params.slug).toLowerCase();

    const product = await ShopProduct.findOne(filter).populate(
      POPULATE_CATEGORIES,
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      product: serializeProduct(product),
      purchasable: isProductPurchasable(product),
      shippingFee: require("../utils/shopPricing").getShippingFee(),
    });
  } catch (error) {
    console.error("getShopProductBySlug:", error);
    res.status(500).json({ message: "Server error fetching product" });
  }
};

exports.getShopProductById = async (req, res) => {
  try {
    const filter = { _id: req.params.id, deletedAt: null };
    if (!canManageShop(req.user)) {
      filter.status = SHOP_PRODUCT_STATUS.PUBLISHED;
    }

    const product = await ShopProduct.findOne(filter).populate(
      POPULATE_CATEGORIES,
    );
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ product: serializeProduct(product) });
  } catch (error) {
    console.error("getShopProductById:", error);
    res.status(500).json({ message: "Server error fetching product" });
  }
};

exports.updateShopProduct = async (req, res) => {
  try {
    const existing = await ShopProduct.findOne({
      _id: req.params.id,
      deletedAt: null,
    });
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    const thumbnailFile = req.files?.thumbnail?.[0];
    const galleryFiles = req.files?.gallery || [];
    const updateData = {};

    if (req.body.title !== undefined) {
      updateData.title = String(req.body.title).trim();
    }
    if (req.body.slug !== undefined && String(req.body.slug).trim()) {
      updateData.slug = String(req.body.slug).trim().toLowerCase();
    } else if (updateData.title) {
      updateData.slug = await uniqueProductSlug(
        updateData.title,
        existing._id,
      );
    }
    if (req.body.sku !== undefined) {
      updateData.sku = String(req.body.sku || "").trim();
    }
    if (req.body.excerpt !== undefined) {
      updateData.excerpt = String(req.body.excerpt || "").trim();
    }
    if (req.body.description !== undefined) {
      updateData.description = String(req.body.description || "");
    }
    if (
      req.body.status &&
      SHOP_PRODUCT_STATUS_VALUES.includes(req.body.status)
    ) {
      updateData.status = req.body.status;
    }
    if (req.body.featured !== undefined) {
      updateData.featured = parseBooleanField(req.body.featured, false);
    }
    if (req.body.sortOrder !== undefined && req.body.sortOrder !== "") {
      updateData.sortOrder = Number(req.body.sortOrder) || 999;
    }
    if (req.body.price !== undefined && req.body.price !== "") {
      updateData.price = Math.max(0, Number(req.body.price) || 0);
    }
    if (req.body.salePrice !== undefined && req.body.salePrice !== "") {
      updateData.salePrice = Math.max(0, Number(req.body.salePrice) || 0);
    }
    if (req.body.categoryIds !== undefined) {
      updateData.categoryIds = await parseCategoryIds(req.body.categoryIds);
    }
    if (req.body.trackInventory !== undefined) {
      updateData.trackInventory = parseBooleanField(
        req.body.trackInventory,
        true,
      );
    }
    if (req.body.stockQuantity !== undefined && req.body.stockQuantity !== "") {
      updateData.stockQuantity = Math.max(
        0,
        Number(req.body.stockQuantity) || 0,
      );
    }
    if (
      req.body.lowStockThreshold !== undefined &&
      req.body.lowStockThreshold !== ""
    ) {
      updateData.lowStockThreshold = Math.max(
        0,
        Number(req.body.lowStockThreshold) || 5,
      );
    }

    if (
      req.body.discountEnabled !== undefined ||
      req.body.discountType !== undefined ||
      req.body.discountValue !== undefined ||
      req.body.discountEndsAt !== undefined
    ) {
      updateData.discount = {
        enabled: parseBooleanField(
          req.body.discountEnabled,
          existing.discount?.enabled,
        ),
        type: req.body.discountType || existing.discount?.type || "percent",
        value:
          req.body.discountValue !== undefined
            ? Number(req.body.discountValue) || 0
            : existing.discount?.value || 0,
        endsAt:
          req.body.discountEndsAt !== undefined
            ? req.body.discountEndsAt || null
            : existing.discount?.endsAt,
      };
    }

    if (thumbnailFile) {
      const thumbnailTypeError = getImageValidationError(thumbnailFile);
      if (thumbnailTypeError) {
        return res.status(400).json({ message: thumbnailTypeError });
      }
      if (existing.thumbnailUrl) {
        try {
          await deleteImage(existing.thumbnailUrl);
        } catch (err) {
          console.warn("Failed to delete old thumbnail:", err.message);
        }
      }
      updateData.thumbnailUrl = await uploadOptimizedImage(
        thumbnailFile.buffer,
        thumbnailFile.originalname,
        "shopProducts/thumbnails",
        { stamp: Date.now() },
      );
    }

    if (galleryFiles.length > 0) {
      const newGalleryUrls = await Promise.all(
        galleryFiles.map((file, index) => {
          const err = getImageValidationError(file);
          if (err) throw new Error(err);
          return uploadOptimizedImage(
            file.buffer,
            file.originalname,
            "shopProducts/gallery",
            { stamp: Date.now(), index },
          );
        }),
      );
      updateData.gallery = [...(existing.gallery || []), ...newGalleryUrls];
    }

    await ShopProduct.findByIdAndUpdate(existing._id, { $set: updateData });
    const product = await ShopProduct.findById(existing._id).populate(
      POPULATE_CATEGORIES,
    );

    res.status(200).json({
      message: "Product updated",
      product: serializeProduct(product),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Slug or SKU already exists" });
    }
    console.error("updateShopProduct:", error);
    res.status(500).json({
      message: error.message || "Server error updating product",
    });
  }
};

exports.deleteShopProduct = async (req, res) => {
  try {
    const product = await ShopProduct.findOne({
      _id: req.params.id,
      deletedAt: null,
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    await product.softDelete();
    res.status(200).json({ message: "Product archived" });
  } catch (error) {
    console.error("deleteShopProduct:", error);
    res.status(500).json({ message: "Server error archiving product" });
  }
};

exports.deleteShopProductImage = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ message: "Image URL is required" });
    }

    const product = await ShopProduct.findOne({
      _id: req.params.id,
      deletedAt: null,
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.thumbnailUrl === url) {
      return res.status(400).json({ message: "Cannot remove main thumbnail" });
    }

    const gallery = (product.gallery || []).filter((g) => g !== url);
    await ShopProduct.findByIdAndUpdate(product._id, { gallery });

    try {
      await deleteImage(url);
    } catch (err) {
      console.warn("Failed to delete image from storage:", err.message);
    }

    res.status(200).json({ message: "Image removed", gallery });
  } catch (error) {
    console.error("deleteShopProductImage:", error);
    res.status(500).json({ message: "Server error removing image" });
  }
};
