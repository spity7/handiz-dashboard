const mongoose = require("mongoose");
const ShopCart = require("../models/shopCartModel");
const {
  MAX_CART_LINE_ITEMS,
  MAX_LINE_QUANTITY,
} = require("../constants/shopCart");
const { enrichCartItems } = require("./shopCheckout");

const normalizeIncomingItems = (items) => {
  if (!Array.isArray(items)) return [];
  const map = new Map();

  for (const row of items) {
    const productId = String(row?.productId || "").trim();
    const qty = Math.max(
      1,
      Math.min(MAX_LINE_QUANTITY, Number(row?.quantity) || 1),
    );
    if (!mongoose.Types.ObjectId.isValid(productId)) continue;
    const prev = map.get(productId) || 0;
    map.set(productId, Math.min(MAX_LINE_QUANTITY, prev + qty));
  }

  return Array.from(map.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
};

const getOrCreateCart = async (userId) => {
  let cart = await ShopCart.findOne({ userId });
  if (!cart) {
    cart = await ShopCart.create({ userId, items: [] });
  }
  return cart;
};

const saveCartItems = async (userId, items) => {
  const normalized = normalizeIncomingItems(items).slice(
    0,
    MAX_CART_LINE_ITEMS,
  );
  const cart = await ShopCart.findOneAndUpdate(
    { userId },
    {
      $set: {
        items: normalized.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      },
    },
    { new: true, upsert: true },
  );
  return cart;
};

const mergeCartItems = async (userId, incomingItems) => {
  const cart = await getOrCreateCart(userId);
  const merged = [
    ...cart.items.map((i) => ({
      productId: String(i.productId),
      quantity: i.quantity,
    })),
  ];

  const incoming = normalizeIncomingItems(incomingItems);
  const map = new Map(merged.map((i) => [i.productId, i.quantity]));

  for (const row of incoming) {
    const prev = map.get(row.productId) || 0;
    map.set(row.productId, Math.min(MAX_LINE_QUANTITY, prev + row.quantity));
  }

  const items = Array.from(map.entries())
    .slice(0, MAX_CART_LINE_ITEMS)
    .map(([productId, quantity]) => ({ productId, quantity }));

  return saveCartItems(userId, items);
};

const clearUserCart = async (userId) => {
  await ShopCart.findOneAndUpdate(
    { userId },
    { $set: { items: [] } },
    { upsert: true },
  );
};

const getCartPayloadForUser = async (userId) => {
  const cart = await ShopCart.findOne({ userId }).lean();
  const rawItems = (cart?.items || []).map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
  }));
  const enriched = await enrichCartItems(rawItems);
  return {
    items: enriched.lines,
    issues: enriched.issues,
    subtotal: enriched.subtotal,
    shippingFee: enriched.shippingFee,
    total: enriched.total,
    valid: enriched.valid,
    itemCount: enriched.lines.reduce((s, l) => s + l.quantity, 0),
  };
};

const getRawCartItemsForUser = async (userId) => {
  const cart = await ShopCart.findOne({ userId }).lean();
  return (cart?.items || []).map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
  }));
};

module.exports = {
  normalizeIncomingItems,
  getOrCreateCart,
  saveCartItems,
  mergeCartItems,
  clearUserCart,
  getCartPayloadForUser,
  getRawCartItemsForUser,
};
