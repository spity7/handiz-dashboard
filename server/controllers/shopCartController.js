const mongoose = require("mongoose");
const {
  getCartPayloadForUser,
  saveCartItems,
  mergeCartItems,
  clearUserCart,
  normalizeIncomingItems,
} = require("../utils/shopCartService");
const { enrichCartItems } = require("../utils/shopCheckout");
const { MAX_LINE_QUANTITY } = require("../constants/shopCart");

exports.getShopCart = async (req, res) => {
  try {
    const cart = await getCartPayloadForUser(req.user._id);
    res.status(200).json({ cart });
  } catch (error) {
    console.error("getShopCart:", error);
    res.status(500).json({ message: "Server error loading cart" });
  }
};

exports.replaceShopCart = async (req, res) => {
  try {
    const items = normalizeIncomingItems(req.body?.items);
    await saveCartItems(req.user._id, items);
    const cart = await getCartPayloadForUser(req.user._id);
    res.status(200).json({ message: "Cart updated", cart });
  } catch (error) {
    console.error("replaceShopCart:", error);
    res.status(500).json({ message: "Server error updating cart" });
  }
};

exports.addShopCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }
    const qty = Math.max(1, Math.min(MAX_LINE_QUANTITY, Number(quantity) || 1));

    const current = await getCartPayloadForUser(req.user._id);
    const items = current.items.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
    }));

    const existing = items.find(
      (i) => String(i.productId) === String(productId),
    );
    if (existing) {
      existing.quantity = Math.min(MAX_LINE_QUANTITY, existing.quantity + qty);
    } else {
      items.push({ productId, quantity: qty });
    }

    await saveCartItems(req.user._id, items);
    const cart = await getCartPayloadForUser(req.user._id);
    res.status(200).json({ cart });
  } catch (error) {
    console.error("addShopCartItem:", error);
    res.status(500).json({ message: "Server error adding to cart" });
  }
};

exports.updateShopCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const quantity = Number(req.body?.quantity);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const current = await getCartPayloadForUser(req.user._id);
    let items = current.items.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
    }));

    if (!Number.isFinite(quantity) || quantity <= 0) {
      items = items.filter((i) => String(i.productId) !== String(productId));
    } else {
      const qty = Math.min(MAX_LINE_QUANTITY, Math.max(1, quantity));
      const found = items.find(
        (i) => String(i.productId) === String(productId),
      );
      if (found) {
        found.quantity = qty;
      } else {
        items.push({ productId, quantity: qty });
      }
    }

    await saveCartItems(req.user._id, items);
    const cart = await getCartPayloadForUser(req.user._id);
    res.status(200).json({ cart });
  } catch (error) {
    console.error("updateShopCartItem:", error);
    res.status(500).json({ message: "Server error updating cart item" });
  }
};

exports.removeShopCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const current = await getCartPayloadForUser(req.user._id);
    const items = current.items
      .filter((l) => String(l.productId) !== String(productId))
      .map((l) => ({ productId: l.productId, quantity: l.quantity }));

    await saveCartItems(req.user._id, items);
    const cart = await getCartPayloadForUser(req.user._id);
    res.status(200).json({ cart });
  } catch (error) {
    console.error("removeShopCartItem:", error);
    res.status(500).json({ message: "Server error removing cart item" });
  }
};

exports.mergeShopCart = async (req, res) => {
  try {
    await mergeCartItems(req.user._id, req.body?.items);
    const cart = await getCartPayloadForUser(req.user._id);
    res.status(200).json({ message: "Cart merged", cart });
  } catch (error) {
    console.error("mergeShopCart:", error);
    res.status(500).json({ message: "Server error merging cart" });
  }
};

exports.validateShopCart = async (req, res) => {
  try {
    const cart = await getCartPayloadForUser(req.user._id);
    if (!cart.valid) {
      return res.status(200).json({
        valid: false,
        cart,
        message: "Cart has items that need attention before checkout",
      });
    }
    res.status(200).json({ valid: true, cart });
  } catch (error) {
    console.error("validateShopCart:", error);
    res.status(500).json({ message: "Server error validating cart" });
  }
};

exports.clearShopCart = async (req, res) => {
  try {
    await clearUserCart(req.user._id);
    const cart = await getCartPayloadForUser(req.user._id);
    res.status(200).json({ message: "Cart cleared", cart });
  } catch (error) {
    console.error("clearShopCart:", error);
    res.status(500).json({ message: "Server error clearing cart" });
  }
};
