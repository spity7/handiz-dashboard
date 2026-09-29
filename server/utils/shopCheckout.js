const mongoose = require("mongoose");
const ShopProduct = require("../models/shopProductModel");
const {
  getProductUnitPrice,
  computeOrderTotals,
  assertCheckoutTotal,
  roundCurrency,
  getShippingFee,
} = require("./shopPricing");
const {
  hasStockForQuantity,
  isProductPurchasable,
} = require("./shopInventory");

const buildLineItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, message: "Cart is empty" };
  }

  const lines = [];
  const lineTotals = [];

  for (const row of items) {
    const productId = row?.productId;
    const quantity = Math.max(1, Number(row?.quantity) || 1);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return { ok: false, message: "Invalid product in cart" };
    }

    const product = await ShopProduct.findOne({
      _id: productId,
      deletedAt: null,
    });

    if (!product || !isProductPurchasable(product)) {
      return {
        ok: false,
        message: `Product unavailable: ${product?.title || productId}`,
      };
    }

    if (!hasStockForQuantity(product, quantity)) {
      return {
        ok: false,
        message: `Insufficient stock for "${product.title}"`,
      };
    }

    const unitPrice = getProductUnitPrice(product);
    const lineTotal = roundCurrency(unitPrice * quantity);
    lineTotals.push(lineTotal);

    lines.push({
      productId: product._id,
      sku: product.sku || "",
      title: product.title,
      thumbnailUrl: product.thumbnailUrl || "",
      unitPrice,
      quantity,
      lineTotal,
    });
  }

  const totals = computeOrderTotals(lineTotals);
  const totalCheck = assertCheckoutTotal(totals.total);
  if (!totalCheck.ok) {
    return { ok: false, message: totalCheck.message };
  }

  return { ok: true, lines, totals };
};

const enrichCartItems = async (rawItems) => {
  const issues = [];
  const lines = [];

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return {
      lines: [],
      issues: [],
      subtotal: 0,
      shippingFee: getShippingFee(),
      total: getShippingFee(),
      valid: true,
    };
  }

  let subtotal = 0;

  for (const row of rawItems) {
    const productId = row?.productId;
    const quantity = Math.max(1, Number(row?.quantity) || 1);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      issues.push({ productId: String(productId), code: "INVALID_PRODUCT" });
      continue;
    }

    const product = await ShopProduct.findOne({
      _id: productId,
      deletedAt: null,
    });

    if (!product) {
      issues.push({ productId: String(productId), code: "NOT_FOUND" });
      continue;
    }

    const purchasable = isProductPurchasable(product);
    const unitPrice = getProductUnitPrice(product);
    const maxQty = product.trackInventory
      ? Math.min(
          Number(product.stockQuantity) || 0,
          require("../constants/shopCart").MAX_LINE_QUANTITY,
        )
      : require("../constants/shopCart").MAX_LINE_QUANTITY;

    let effectiveQty = quantity;
    const lineIssues = [];

    if (!purchasable) {
      lineIssues.push("UNAVAILABLE");
    }
    if (product.trackInventory && effectiveQty > maxQty) {
      lineIssues.push("INSUFFICIENT_STOCK");
      effectiveQty = Math.max(0, maxQty);
    }

    if (effectiveQty <= 0) {
      issues.push({
        productId: String(productId),
        code: "REMOVED",
        reasons: lineIssues,
      });
      continue;
    }

    const lineTotal = roundCurrency(unitPrice * effectiveQty);
    subtotal = roundCurrency(subtotal + lineTotal);

    lines.push({
      productId: String(product._id),
      slug: product.slug,
      title: product.title,
      thumbnailUrl: product.thumbnailUrl || "",
      quantity: effectiveQty,
      unitPrice,
      lineTotal,
      purchasable,
      trackInventory: Boolean(product.trackInventory),
      stockQuantity: Number(product.stockQuantity) || 0,
      maxQuantity: maxQty,
      issues: lineIssues,
    });

    if (lineIssues.length > 0) {
      issues.push({
        productId: String(productId),
        code: "LINE_ADJUSTED",
        reasons: lineIssues,
        quantity: effectiveQty,
      });
    }
  }

  const shippingFee = getShippingFee();
  const total = roundCurrency(subtotal + shippingFee);
  const valid =
    lines.length > 0 &&
    lines.every((l) => l.purchasable && l.issues.length === 0) &&
    issues.filter((i) => i.code === "NOT_FOUND" || i.code === "INVALID_PRODUCT")
      .length === 0;

  return {
    lines,
    issues,
    subtotal,
    shippingFee,
    total,
    valid,
  };
};

module.exports = {
  buildLineItems,
  enrichCartItems,
};
