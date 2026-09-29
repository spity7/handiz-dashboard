const ShopProduct = require("../models/shopProductModel");
const { SHOP_PRODUCT_STATUS } = require("../constants/shopStatus");

const isProductPurchasable = (product) => {
  if (!product || product.deletedAt) return false;
  if (product.status !== SHOP_PRODUCT_STATUS.PUBLISHED) return false;
  if (!product.trackInventory) return true;
  return (Number(product.stockQuantity) || 0) > 0;
};

const hasStockForQuantity = (product, quantity) => {
  if (!product.trackInventory) return true;
  const stock = Number(product.stockQuantity) || 0;
  return stock >= quantity;
};

/**
 * Atomically decrement stock for a paid order line.
 * Returns false if insufficient stock.
 */
const decrementStock = async (productId, quantity, session) => {
  const qty = Math.max(1, Number(quantity) || 1);
  const product = await ShopProduct.findById(productId).session(session);
  if (!product) return { ok: false, reason: "Product not found" };
  if (!product.trackInventory) return { ok: true };

  const updated = await ShopProduct.findOneAndUpdate(
    {
      _id: productId,
      deletedAt: null,
      trackInventory: true,
      stockQuantity: { $gte: qty },
    },
    { $inc: { stockQuantity: -qty } },
    { new: true, session },
  );

  if (!updated) {
    return { ok: false, reason: "Insufficient stock" };
  }
  return { ok: true, product: updated };
};

/**
 * Restore stock when cancelling an unpaid or paid order (admin cancel).
 */
const restoreStock = async (productId, quantity, session) => {
  const qty = Math.max(1, Number(quantity) || 1);
  const product = await ShopProduct.findById(productId).session(session);
  if (!product || !product.trackInventory) return { ok: true };

  await ShopProduct.findByIdAndUpdate(
    productId,
    { $inc: { stockQuantity: qty } },
    { session },
  );
  return { ok: true };
};

module.exports = {
  isProductPurchasable,
  hasStockForQuantity,
  decrementStock,
  restoreStock,
};
