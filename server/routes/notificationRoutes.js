const express = require("express");
const router = express.Router();
const protectRoute = require("../middlewares/protectRoute");
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

router.get("/notifications", protectRoute, getNotifications);
router.get("/notifications/unread-count", protectRoute, getUnreadCount);
router.patch("/notifications/:id/read", protectRoute, markAsRead);
router.patch("/notifications/read-all", protectRoute, markAllAsRead);

module.exports = router;
