const {
  COURSE_CURRENCY,
  COURSE_DISCOUNT_TYPE,
  MIN_PAID_COURSE_PRICE,
} = require("../constants/courseStatus");

const roundCurrency = (amount) => Math.round(amount * 100) / 100;

const parseBooleanField = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "")
    return defaultValue;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return defaultValue;
};

const parseEndsAt = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { error: "Invalid end date" };
  }
  return date;
};

const isDiscountExpired = (discount, now = new Date()) => {
  if (!discount?.enabled || !discount.endsAt) return false;
  const endsAt = new Date(discount.endsAt);
  return !Number.isNaN(endsAt.getTime()) && endsAt.getTime() <= now.getTime();
};

const isFreeOfferExpired = (pricing, now = new Date()) => {
  if (!pricing?.isFree || !pricing.freeEndsAt) return false;
  const endsAt = new Date(pricing.freeEndsAt);
  return !Number.isNaN(endsAt.getTime()) && endsAt.getTime() <= now.getTime();
};

const isEffectivelyFree = (pricing, now = new Date()) =>
  Boolean(pricing?.isFree && !isFreeOfferExpired(pricing, now));

const getEffectiveDiscount = (discount, now = new Date()) => {
  if (!discount?.enabled) {
    return {
      enabled: false,
      type: discount?.type || COURSE_DISCOUNT_TYPE.PERCENT,
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

  if (discount.type === COURSE_DISCOUNT_TYPE.FIXED) {
    return roundCurrency(Math.max(0, price - value));
  }

  const percent = Math.min(100, Math.max(0, value));
  return roundCurrency(price * (1 - percent / 100));
};

const resolveEffectivePricing = (pricing, now = new Date()) => {
  if (!pricing) return pricing;

  const plain =
    typeof pricing.toObject === "function"
      ? pricing.toObject()
      : { ...pricing };

  if (plain.isFree) {
    if (isFreeOfferExpired(plain, now)) {
      const listPrice = Number(plain.price) || 0;
      if (listPrice > 0) {
        return {
          ...plain,
          isFree: false,
          salePrice: listPrice,
          freeEndsAt: plain.freeEndsAt,
          discount: {
            enabled: false,
            type: COURSE_DISCOUNT_TYPE.PERCENT,
            value: 0,
            endsAt: null,
          },
        };
      }
    }

    return {
      ...plain,
      salePrice: 0,
    };
  }

  const listPrice = Number(plain.price) || 0;
  const effectiveDiscount = getEffectiveDiscount(plain.discount, now);
  const salePrice = effectiveDiscount.enabled
    ? computeSalePrice(listPrice, effectiveDiscount)
    : listPrice;

  return {
    ...plain,
    salePrice,
    discount: effectiveDiscount,
    freeEndsAt: null,
  };
};

const getCourseCheckoutAmount = (pricing, now = new Date()) => {
  const resolved = resolveEffectivePricing(pricing, now);
  if (!resolved || resolved.isFree) return 0;
  return Number(resolved.salePrice) || 0;
};

const hasActiveDiscount = (pricing, now = new Date()) => {
  const resolved = resolveEffectivePricing(pricing, now);
  if (!resolved || resolved.isFree) return false;
  const listPrice = Number(resolved.price) || 0;
  const salePrice = Number(resolved.salePrice) || 0;
  return salePrice > 0 && salePrice < listPrice;
};

const hasFreeCompareAt = (pricing, now = new Date()) => {
  const resolved = resolveEffectivePricing(pricing, now);
  return Boolean(resolved?.isFree && Number(resolved.price) > 0);
};

const normalizePromotionEndsAt = (
  hasExpiry,
  endsAtValue,
  { label = "End date" } = {},
) => {
  const expirationEnabled = parseBooleanField(hasExpiry, false);
  if (!expirationEnabled) {
    return { endsAt: null };
  }

  const parsed = parseEndsAt(endsAtValue);
  if (parsed?.error) return parsed;
  if (!parsed) {
    return { error: `${label} is required when expiration is enabled` };
  }
  if (parsed.getTime() <= Date.now()) {
    return { error: `${label} must be in the future` };
  }

  return { endsAt: parsed };
};

const normalizeDiscount = (pricingFields, listPrice) => {
  const enabled = parseBooleanField(pricingFields.discountEnabled, false);
  if (!enabled) {
    return {
      discount: {
        enabled: false,
        type: COURSE_DISCOUNT_TYPE.PERCENT,
        value: 0,
        endsAt: null,
      },
      salePrice: listPrice,
    };
  }

  const type =
    pricingFields.discountType === COURSE_DISCOUNT_TYPE.FIXED
      ? COURSE_DISCOUNT_TYPE.FIXED
      : COURSE_DISCOUNT_TYPE.PERCENT;

  const value = Number(pricingFields.discountValue);
  if (!Number.isFinite(value) || value < 0) {
    return { error: "Discount value cannot be negative." };
  }
  if (value <= 0) {
    return { error: "Discount value must be greater than 0" };
  }

  if (type === COURSE_DISCOUNT_TYPE.PERCENT && value >= 100) {
    return { error: "Percentage discount must be less than 100%" };
  }

  if (type === COURSE_DISCOUNT_TYPE.FIXED && value >= listPrice) {
    return { error: "Fixed discount must be less than the list price" };
  }

  const endsAtResult = normalizePromotionEndsAt(
    pricingFields.discountHasExpiry,
    pricingFields.discountEndsAt,
    { label: "Discount end date" },
  );
  if (endsAtResult.error) return { error: endsAtResult.error };

  const discount = {
    enabled: true,
    type,
    value,
    endsAt: endsAtResult.endsAt,
  };
  const salePrice = computeSalePrice(listPrice, discount);

  if (salePrice < MIN_PAID_COURSE_PRICE) {
    return {
      error: `Discount is too large. Minimum checkout price is $${MIN_PAID_COURSE_PRICE.toFixed(2)} USD.`,
    };
  }

  if (salePrice >= listPrice) {
    return { error: "Discount must reduce the list price" };
  }

  return { discount, salePrice };
};

const normalizeCoursePricing = (
  isFree,
  price,
  pricingFields = {},
  { defaultIsFree = true } = {},
) => {
  const resolvedIsFree =
    isFree === undefined
      ? defaultIsFree
      : parseBooleanField(isFree, defaultIsFree);

  if (resolvedIsFree) {
    const numericListPrice =
      price !== undefined && price !== null && price !== "" ? Number(price) : 0;

    if (Number.isFinite(numericListPrice) && numericListPrice < 0) {
      return { error: "Price cannot be negative." };
    }

    const listPrice =
      Number.isFinite(numericListPrice) && numericListPrice > 0
        ? roundCurrency(numericListPrice)
        : 0;

    if (
      parseBooleanField(pricingFields.freeHasExpiry, false) &&
      listPrice <= 0
    ) {
      return {
        error: "Free offer expiration requires a compare-at price above $0.",
      };
    }

    const freeEndsResult = normalizePromotionEndsAt(
      pricingFields.freeHasExpiry,
      pricingFields.freeEndsAt,
      { label: "Free offer end date" },
    );
    if (freeEndsResult.error) return { error: freeEndsResult.error };

    return {
      isFree: true,
      price: listPrice,
      salePrice: 0,
      currency: COURSE_CURRENCY,
      freeEndsAt: freeEndsResult.endsAt,
      discount: {
        enabled: false,
        type: COURSE_DISCOUNT_TYPE.PERCENT,
        value: 0,
        endsAt: null,
      },
    };
  }

  const numericPrice =
    price !== undefined && price !== null && price !== "" ? Number(price) : 0;

  if (Number.isFinite(numericPrice) && numericPrice < 0) {
    return { error: "Price cannot be negative." };
  }

  if (!Number.isFinite(numericPrice) || numericPrice < MIN_PAID_COURSE_PRICE) {
    return {
      error: `Paid courses must have a list price of at least $${MIN_PAID_COURSE_PRICE.toFixed(2)} USD.`,
    };
  }

  const discountResult = normalizeDiscount(pricingFields, numericPrice);
  if (discountResult.error) return { error: discountResult.error };

  return {
    isFree: false,
    price: numericPrice,
    salePrice: discountResult.salePrice,
    currency: COURSE_CURRENCY,
    freeEndsAt: null,
    discount: discountResult.discount,
  };
};

const toPublicPricing = (pricing, now = new Date()) => {
  if (!pricing) return pricing;

  const plain =
    typeof pricing.toObject === "function"
      ? pricing.toObject()
      : { ...pricing };

  const resolved = resolveEffectivePricing(plain, now);

  if (resolved.isFree) {
    return {
      ...resolved,
      freeEndsAt: plain.freeEndsAt || null,
    };
  }

  if (plain.isFree && isFreeOfferExpired(plain, now)) {
    return {
      ...resolved,
      freeEndsAt: null,
    };
  }

  const expired = isDiscountExpired(plain.discount, now);
  if (expired) {
    return {
      ...resolved,
      discount: {
        enabled: false,
        type: plain.discount?.type || COURSE_DISCOUNT_TYPE.PERCENT,
        value: 0,
        endsAt: null,
      },
    };
  }

  return resolved;
};

const enrichAdminPricing = (pricing, now = new Date()) => {
  if (!pricing) return pricing;

  const plain =
    typeof pricing.toObject === "function"
      ? pricing.toObject()
      : { ...pricing };

  if (plain.isFree) {
    const freeOfferExpired = isFreeOfferExpired(plain, now);
    const effective = resolveEffectivePricing(plain, now);
    return {
      ...plain,
      salePrice: effective.salePrice,
      freeOfferExpired,
      effectiveIsFree: effective.isFree,
      discountExpired: false,
    };
  }

  if (!plain.discount?.enabled) {
    return { ...plain, discountExpired: false, freeOfferExpired: false };
  }

  const expired = isDiscountExpired(plain.discount, now);
  const effective = resolveEffectivePricing(plain, now);

  return {
    ...plain,
    salePrice: effective.salePrice,
    discountExpired: expired,
    freeOfferExpired: false,
  };
};

const serializeCourseForResponse = (course, { forAdmin = false } = {}) => {
  if (!course) return course;

  const plain =
    typeof course.toObject === "function" ? course.toObject() : { ...course };

  if (!plain.pricing) return plain;

  return {
    ...plain,
    pricing: forAdmin
      ? enrichAdminPricing(plain.pricing)
      : toPublicPricing(plain.pricing),
  };
};

module.exports = {
  roundCurrency,
  parseBooleanField,
  parseEndsAt,
  isDiscountExpired,
  isFreeOfferExpired,
  isEffectivelyFree,
  getEffectiveDiscount,
  computeSalePrice,
  resolveEffectivePricing,
  getCourseCheckoutAmount,
  hasActiveDiscount,
  hasFreeCompareAt,
  normalizeDiscount,
  normalizeCoursePricing,
  toPublicPricing,
  enrichAdminPricing,
  serializeCourseForResponse,
};
