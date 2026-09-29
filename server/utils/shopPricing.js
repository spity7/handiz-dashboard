const {
  SHOP_CURRENCY,
  SHOP_DISCOUNT_TYPE,
  MIN_PAID_SHOP_PRICE,
} = require("../constants/shopStatus");

const roundCurrency = (amount) => Math.round(amount * 100) / 100;

const isDiscountExpired = (discount, now = new Date()) => {
  if (!discount?.enabled || !discount.endsAt) return false;
  const endsAt = new Date(discount.endsAt);
  return !Number.isNaN(endsAt.getTime()) && endsAt.getTime() <= now.getTime();
};

const getEffectiveDiscount = (discount, now = new Date()) => {
  if (!discount?.enabled) {
    return {
      enabled: false,
      type: discount?.type || SHOP_DISCOUNT_TYPE.PERCENT,
      value: 0,
      endsAt: discount?.endsAt || null,
    };
  }

  if (isDiscountExpired(discount, now)) {
    return {
      enabled: false,
      type: discount.type,
      value: discount.value,
      endsAt: discount.endsAt,
    };
  }

  return discount;
};

const computeSalePrice = (listPrice, discount) => {
  const price = Math.max(0, Number(listPrice) || 0);
  if (!discount?.enabled || price <= 0) return price;

  const value = Math.max(0, Number(discount.value) || 0);
  if (value <= 0) return price;

  if (discount.type === SHOP_DISCOUNT_TYPE.FIXED) {
    return roundCurrency(Math.max(0, price - value));
  }

  const percent = Math.min(100, Math.max(0, value));
  return roundCurrency(price * (1 - percent / 100));
};

const resolveProductPricing = (product, now = new Date()) => {
  const plain =
    typeof product?.toObject === "function"
      ? product.toObject()
      : { ...product };

  const listPrice = Number(plain.price) || 0;
  const manualSale = Number(plain.salePrice) || 0;
  const effectiveDiscount = getEffectiveDiscount(plain.discount, now);
  let unitPrice = listPrice;

  if (effectiveDiscount.enabled) {
    unitPrice = computeSalePrice(listPrice, effectiveDiscount);
  } else if (manualSale > 0 && manualSale < listPrice) {
    unitPrice = roundCurrency(manualSale);
  }

  return {
    listPrice,
    unitPrice: roundCurrency(unitPrice),
    currency: plain.currency || SHOP_CURRENCY,
  };
};

const getProductUnitPrice = (product, now = new Date()) =>
  resolveProductPricing(product, now).unitPrice;

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
