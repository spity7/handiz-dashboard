const {
  SHOP_CURRENCY,
  MIN_PAID_SHOP_PRICE,
} = require("../constants/shopStatus");

const roundCurrency = (amount) => Math.round(amount * 100) / 100;

/** Shop products use list price + optional sale price only (no promo discount object). */
const resolveProductPricing = (product) => {
  const plain =
    typeof product?.toObject === "function"
      ? product.toObject()
      : { ...product };

  const listPrice = Number(plain.price) || 0;
  const manualSale = Number(plain.salePrice) || 0;
  let unitPrice = listPrice;

  if (manualSale > 0 && manualSale < listPrice) {
    unitPrice = roundCurrency(manualSale);
  }

  return {
    listPrice,
    unitPrice: roundCurrency(unitPrice),
    currency: plain.currency || SHOP_CURRENCY,
  };
};

const getProductUnitPrice = (product) =>
  resolveProductPricing(product).unitPrice;

const getShippingFee = () => {
  const raw = process.env.SHOP_SHIPPING_FEE_USD;
  const fee = raw === undefined || raw === "" ? 0 : Number(raw);
  if (!Number.isFinite(fee) || fee < 0) return 0;
  return roundCurrency(fee);
};

const computeOrderTotals = (lineTotals) => {
  const subtotal = roundCurrency(
    lineTotals.reduce((sum, n) => sum + (Number(n) || 0), 0),
  );
  const shippingFee = getShippingFee();
  const total = roundCurrency(subtotal + shippingFee);
  return { subtotal, shippingFee, total, currency: SHOP_CURRENCY };
};

const assertCheckoutTotal = (total) => {
  if (total <= 0) {
    return { ok: false, message: "Order total must be greater than zero" };
  }
  if (total < MIN_PAID_SHOP_PRICE) {
    return {
      ok: false,
      message: `Minimum order amount is $${MIN_PAID_SHOP_PRICE}`,
    };
  }
  return { ok: true };
};

module.exports = {
  roundCurrency,
  resolveProductPricing,
  getProductUnitPrice,
  getShippingFee,
  computeOrderTotals,
  assertCheckoutTotal,
};
