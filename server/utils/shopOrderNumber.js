const ShopOrder = require("../models/shopOrderModel");

const pad = (n, len = 4) => String(n).padStart(len, "0");

const generateShopOrderNumber = async () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1, 2);
  const d = pad(now.getDate(), 2);
  const prefix = `HZ-${y}${m}${d}`;

  const startOfDay = new Date(y, now.getMonth(), now.getDate());
  const endOfDay = new Date(y, now.getMonth(), now.getDate() + 1);

  const count = await ShopOrder.countDocuments({
    createdAt: { $gte: startOfDay, $lt: endOfDay },
  });

  return `${prefix}-${pad(count + 1)}`;
};

module.exports = { generateShopOrderNumber };
