const mongoose = require("mongoose");
const ShopOrder = require("../models/shopOrderModel");
const {
  SHOP_PAYMENT_STATUS,
  SHOP_FULFILLMENT_STATUS,
  SHOP_CURRENCY,
} = require("../constants/shopStatus");
const { buildLineItems } = require("../utils/shopCheckout");
const { decrementStock } = require("../utils/shopInventory");
const {
  getRawCartItemsForUser,
  clearUserCart,
} = require("../utils/shopCartService");
const { generateShopOrderNumber } = require("../utils/shopOrderNumber");
const {
  createWhishPaymentSession,
  getHandizSiteUrl,
} = require("../utils/whishCheckout");
const {
  upsertUnreadNotification,
} = require("../utils/helpers/notificationService");

const validateShippingAddress = (body) => {
  const a = body?.shippingAddress || body;
  const required = [
    "fullName",
    "phone",
    "governorate",
    "city",
    "area",
    "street",
  ];
  const shippingAddress = {};
  for (const key of required) {
    const val = String(a?.[key] || "").trim();
    if (!val) {
      return { ok: false, message: `${key} is required for shipping` };
    }
    shippingAddress[key] = val;
  }
  shippingAddress.building = String(a?.building || "").trim();
  shippingAddress.notes = String(a?.notes || "").trim();
  return { ok: true, shippingAddress };
};

exports.createShopCheckout = async (req, res) => {
  try {
    const shippingResult = validateShippingAddress(req.body);
    if (!shippingResult.ok) {
      return res.status(400).json({ message: shippingResult.message });
    }

    const cartItems = await getRawCartItemsForUser(req.user._id);
    const built = await buildLineItems(cartItems);
    if (!built.ok) {
      return res.status(400).json({ message: built.message });
    }

    const { lines, totals } = built;
    const orderNumber = await generateShopOrderNumber();

    const whish = require("../utils/whish").getWhishClient();
    if (!whish) {
      return res.status(503).json({ message: "Payment system not configured" });
    }

    const externalId = whish.generateExternalId();

    const order = await ShopOrder.create({
      orderNumber,
      userId: req.user._id,
      items: lines,
      subtotal: totals.subtotal,
      shippingFee: totals.shippingFee,
      total: totals.total,
      currency: SHOP_CURRENCY,
      shippingAddress: shippingResult.shippingAddress,
      whishExternalId: String(externalId),
      paymentStatus: SHOP_PAYMENT_STATUS.PENDING,
      fulfillmentStatus: SHOP_FULFILLMENT_STATUS.PENDING,
      statusHistory: [
        {
          status: SHOP_FULFILLMENT_STATUS.PENDING,
          at: new Date(),
          note: "Order created",
        },
      ],
    });

    const handizBase = getHandizSiteUrl();
    const successRedirect =
      process.env.WHISH_SHOP_SUCCESS_URL ||
      `${handizBase}/shop/orders/{orderId}?payment=success`;
    const failureRedirect =
      process.env.WHISH_SHOP_CANCEL_URL ||
      `${handizBase}/shop/orders/{orderId}?payment=failed`;

    const payment = await createWhishPaymentSession({
      req,
      amount: totals.total,
      currency: SHOP_CURRENCY,
      invoice: `Handiz Shop ${orderNumber}`,
      externalId,
      successRedirectUrl: successRedirect.replace("{orderId}", order._id),
      failureRedirectUrl: failureRedirect.replace("{orderId}", order._id),
    });

    if (!payment.ok) {
      await ShopOrder.findByIdAndUpdate(order._id, {
        paymentStatus: SHOP_PAYMENT_STATUS.FAILED,
        failureReason: payment.message,
      });
      return res
        .status(payment.status || 400)
        .json({ message: payment.message });
    }

    await clearUserCart(req.user._id);

    res.status(200).json({
      url: payment.collectUrl,
      externalId: String(externalId),
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    console.error("createShopCheckout:", error);
    res.status(500).json({ message: "Server error creating checkout" });
  }
};

const fulfillPaidShopOrderFromRecord = async (
  order,
  { transactionId = "" } = {},
) => {
  if (!order) return null;
  if (order.paymentStatus === SHOP_PAYMENT_STATUS.PAID) {
    return order;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const line of order.items) {
      const result = await decrementStock(
        line.productId,
        line.quantity,
        session,
      );
      if (!result.ok) {
        await session.abortTransaction();
        session.endSession();
        await ShopOrder.findByIdAndUpdate(order._id, {
          paymentStatus: SHOP_PAYMENT_STATUS.FAILED,
          failureReason: result.reason || "Inventory error",
        });
        return null;
      }
    }

    const updated = await ShopOrder.findByIdAndUpdate(
      order._id,
      {
        paymentStatus: SHOP_PAYMENT_STATUS.PAID,
        paidAt: new Date(),
        whishTransactionId: transactionId || order.whishTransactionId,
        fulfillmentStatus: SHOP_FULFILLMENT_STATUS.PROCESSING,
        $push: {
          statusHistory: {
            status: SHOP_FULFILLMENT_STATUS.PROCESSING,
            at: new Date(),
            note: "Payment received",
          },
        },
      },
      { new: true, session },
    );

    await session.commitTransaction();
    session.endSession();

    await upsertUnreadNotification({
      recipientId: order.userId,
      type: "payment_received",
      title: "Shop order confirmed",
      message: `Your order ${order.orderNumber} was paid successfully.`,
      link: `${getHandizSiteUrl()}/shop/orders/${order._id}`,
    });

    return updated;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("fulfillPaidShopOrderFromRecord:", err);
    throw err;
  }
};

exports.fulfillPaidShopOrder = async ({ externalId, transactionId }) => {
  const order = await ShopOrder.findOne({
    whishExternalId: String(externalId),
  });
  if (!order) return null;
  return fulfillPaidShopOrderFromRecord(order, { transactionId });
};

exports.fulfillPaidShopOrderFromRecord = fulfillPaidShopOrderFromRecord;
