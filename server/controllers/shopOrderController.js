const mongoose = require("mongoose");
const ShopOrder = require("../models/shopOrderModel");
const {
  SHOP_PAYMENT_STATUS,
  SHOP_FULFILLMENT_STATUS,
  SHOP_FULFILLMENT_STATUS_VALUES,
} = require("../constants/shopStatus");
const { hasPermission } = require("../constants/permissions");
const { restoreStock } = require("../utils/shopInventory");

const canReadOrders = (user) =>
  user && hasPermission(user.role, "shop:orders:read");
const canManageOrders = (user) =>
  user && hasPermission(user.role, "shop:orders:manage");

const FULFILLMENT_TRANSITIONS = {
  [SHOP_FULFILLMENT_STATUS.PENDING]: [
    SHOP_FULFILLMENT_STATUS.PROCESSING,
    SHOP_FULFILLMENT_STATUS.CANCELLED,
  ],
  [SHOP_FULFILLMENT_STATUS.PROCESSING]: [
    SHOP_FULFILLMENT_STATUS.SHIPPED,
    SHOP_FULFILLMENT_STATUS.CANCELLED,
  ],
  [SHOP_FULFILLMENT_STATUS.SHIPPED]: [SHOP_FULFILLMENT_STATUS.DELIVERED],
  [SHOP_FULFILLMENT_STATUS.DELIVERED]: [],
  [SHOP_FULFILLMENT_STATUS.CANCELLED]: [],
};

exports.getMyShopOrders = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = { userId: req.user._id };
    const [total, orders] = await Promise.all([
      ShopOrder.countDocuments(filter),
      ShopOrder.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.status(200).json({
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
    });
  } catch (error) {
    console.error("getMyShopOrders:", error);
    res.status(500).json({ message: "Server error fetching orders" });
  }
};

exports.getShopOrderById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await ShopOrder.findById(req.params.id)
      .populate("userId", "firstname lastname email")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const isOwner =
      order.userId &&
      String(order.userId._id || order.userId) === String(req.user._id);

    if (!isOwner && !canReadOrders(req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.status(200).json({ order });
  } catch (error) {
    console.error("getShopOrderById:", error);
    res.status(500).json({ message: "Server error fetching order" });
  }
};

exports.listShopOrdersAdmin = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.paymentStatus) {
      filter.paymentStatus = String(req.query.paymentStatus);
    }
    if (req.query.fulfillmentStatus) {
      filter.fulfillmentStatus = String(req.query.fulfillmentStatus);
    }
    if (req.query.q) {
      const q = String(req.query.q).trim();
      filter.$or = [
        { orderNumber: new RegExp(q, "i") },
        { "shippingAddress.fullName": new RegExp(q, "i") },
        { "shippingAddress.phone": new RegExp(q, "i") },
      ];
    }

    const [total, orders] = await Promise.all([
      ShopOrder.countDocuments(filter),
      ShopOrder.find(filter)
        .populate("userId", "firstname lastname email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const summary = await ShopOrder.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", SHOP_PAYMENT_STATUS.PAID] },
                "$total",
                0,
              ],
            },
          },
        },
      },
    ]);

    res.status(200).json({
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
      summary,
    });
  } catch (error) {
    console.error("listShopOrdersAdmin:", error);
    res.status(500).json({ message: "Server error fetching orders" });
  }
};

exports.updateShopOrderFulfillment = async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!status || !SHOP_FULFILLMENT_STATUS_VALUES.includes(status)) {
      return res.status(400).json({ message: "Invalid fulfillment status" });
    }

    const order = await ShopOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (
      order.paymentStatus !== SHOP_PAYMENT_STATUS.PAID &&
      status !== SHOP_FULFILLMENT_STATUS.CANCELLED
    ) {
      return res.status(400).json({
        message: "Only paid orders can be fulfilled",
      });
    }

    const allowed = FULFILLMENT_TRANSITIONS[order.fulfillmentStatus] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Cannot transition from ${order.fulfillmentStatus} to ${status}`,
      });
    }

    order.fulfillmentStatus = status;
    order.statusHistory.push({
      status,
      at: new Date(),
      byUserId: req.user._id,
      note: String(note || "").trim(),
    });

    if (status === SHOP_FULFILLMENT_STATUS.CANCELLED) {
      order.cancelledAt = new Date();
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        if (order.paymentStatus === SHOP_PAYMENT_STATUS.PAID) {
          for (const line of order.items) {
            await restoreStock(line.productId, line.quantity, session);
          }
        }
        await order.save({ session });
        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    } else {
      await order.save();
    }

    res.status(200).json({ message: "Order updated", order });
  } catch (error) {
    console.error("updateShopOrderFulfillment:", error);
    res.status(500).json({ message: "Server error updating order" });
  }
};

exports.cancelShopOrder = async (req, res) => {
  try {
    const order = await ShopOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const isOwner = String(order.userId) === String(req.user._id);
    const isAdmin = canManageOrders(req.user);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (order.paymentStatus === SHOP_PAYMENT_STATUS.PAID) {
      if (!isAdmin) {
        return res.status(400).json({
          message:
            "Paid orders cannot be cancelled by customer. Contact support.",
        });
      }
    } else if (order.paymentStatus !== SHOP_PAYMENT_STATUS.PENDING) {
      return res.status(400).json({ message: "Order cannot be cancelled" });
    }

    if (order.fulfillmentStatus === SHOP_FULFILLMENT_STATUS.CANCELLED) {
      return res.status(200).json({ message: "Already cancelled", order });
    }

    const wasPaid = order.paymentStatus === SHOP_PAYMENT_STATUS.PAID;

    order.fulfillmentStatus = SHOP_FULFILLMENT_STATUS.CANCELLED;
    order.cancelledAt = new Date();
    if (order.paymentStatus === SHOP_PAYMENT_STATUS.PENDING) {
      order.paymentStatus = SHOP_PAYMENT_STATUS.FAILED;
      order.failureReason = "Cancelled by user";
    }

    if (wasPaid) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        for (const line of order.items) {
          await restoreStock(line.productId, line.quantity, session);
        }
        order.statusHistory.push({
          status: SHOP_FULFILLMENT_STATUS.CANCELLED,
          at: new Date(),
          byUserId: req.user._id,
          note: "Cancelled by admin",
        });
        await order.save({ session });
        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    } else {
      order.statusHistory.push({
        status: SHOP_FULFILLMENT_STATUS.CANCELLED,
        at: new Date(),
        byUserId: req.user._id,
        note: "Cancelled",
      });
      await order.save();
    }

    res.status(200).json({ message: "Order cancelled", order });
  } catch (error) {
    console.error("cancelShopOrder:", error);
    res.status(500).json({ message: "Server error cancelling order" });
  }
};
