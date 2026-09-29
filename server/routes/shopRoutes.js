const express = require("express");
const multer = require("multer");
const router = express.Router();
const protectRoute = require("../middlewares/protectRoute");
const optionalAuth = require("../middlewares/optionalAuth");
const authorizePermission = require("../middlewares/authorizePermission");
const {
  listShopCategories,
  createShopCategory,
  updateShopCategory,
  deleteShopCategory,
} = require("../controllers/shopCategoryController");
const {
  createShopProduct,
  getShopProducts,
  getShopProductBySlug,
  getShopProductById,
  updateShopProduct,
  deleteShopProduct,
  deleteShopProductImage,
} = require("../controllers/shopProductController");
const { createShopCheckout } = require("../controllers/shopPaymentController");
const {
  getShopCart,
  replaceShopCart,
  addShopCartItem,
  updateShopCartItem,
  removeShopCartItem,
  mergeShopCart,
  validateShopCart,
  clearShopCart,
} = require("../controllers/shopCartController");
const {
  getMyShopOrders,
  getShopOrderById,
  listShopOrdersAdmin,
  updateShopOrderFulfillment,
  cancelShopOrder,
} = require("../controllers/shopOrderController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 30,
  },
});

const productUpload = upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "gallery", maxCount: 20 },
]);

router.get("/shop/categories", listShopCategories);
router.post(
  "/shop/categories",
  protectRoute,
  authorizePermission("shop:manage"),
  createShopCategory,
);
router.put(
  "/shop/categories/:categoryId",
  protectRoute,
  authorizePermission("shop:manage"),
  updateShopCategory,
);
router.delete(
  "/shop/categories/:categoryId",
  protectRoute,
  authorizePermission("shop:manage"),
  deleteShopCategory,
);

router.get("/shop/products", optionalAuth, getShopProducts);
router.get("/shop/products/slug/:slug", optionalAuth, getShopProductBySlug);
router.get("/shop/products/:id", optionalAuth, getShopProductById);
router.post(
  "/shop/products",
  protectRoute,
  authorizePermission("shop:manage"),
  productUpload,
  createShopProduct,
);
router.put(
  "/shop/products/:id",
  protectRoute,
  authorizePermission("shop:manage"),
  productUpload,
  updateShopProduct,
);
router.delete(
  "/shop/products/:id",
  protectRoute,
  authorizePermission("shop:manage"),
  deleteShopProduct,
);
router.delete(
  "/shop/products/:id/gallery",
  protectRoute,
  authorizePermission("shop:manage"),
  deleteShopProductImage,
);

router.get("/shop/cart", protectRoute, getShopCart);
router.put("/shop/cart", protectRoute, replaceShopCart);
router.post("/shop/cart/items", protectRoute, addShopCartItem);
router.patch("/shop/cart/items/:productId", protectRoute, updateShopCartItem);
router.delete("/shop/cart/items/:productId", protectRoute, removeShopCartItem);
router.post("/shop/cart/merge", protectRoute, mergeShopCart);
router.post("/shop/cart/validate", protectRoute, validateShopCart);
router.delete("/shop/cart", protectRoute, clearShopCart);

router.post("/shop/checkout", protectRoute, createShopCheckout);
router.get("/shop/orders/me", protectRoute, getMyShopOrders);
router.get(
  "/shop/orders",
  protectRoute,
  authorizePermission("shop:orders:read"),
  listShopOrdersAdmin,
);
router.get("/shop/orders/:id", protectRoute, getShopOrderById);
router.patch(
  "/shop/orders/:id/fulfillment",
  protectRoute,
  authorizePermission("shop:orders:manage"),
  updateShopOrderFulfillment,
);
router.patch("/shop/orders/:id/cancel", protectRoute, cancelShopOrder);

module.exports = router;
