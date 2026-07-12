const DISCOUNT_TYPE = {
  PERCENT: 'percent',
  FIXED: 'fixed',
}

// Must match server/constants/courseStatus.js MIN_PAID_COURSE_PRICE
const MIN_PAID_COURSE_PRICE = 5
const MIN_DISCOUNT_VALUE = 1

const roundCurrency = (amount) => Math.round(amount * 100) / 100

export const clampNonNegativeNumber = (value, { allowEmpty = true } = {}) => {
  if (allowEmpty && (value === '' || value === null || value === undefined)) return value
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return allowEmpty ? value : 0
  return Math.max(0, numeric)
}

export const toDatetimeLocalValue = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const isDiscountExpired = (discount, now = new Date()) => {
  if (!discount?.enabled || !discount.endsAt) return false
  const endsAt = new Date(discount.endsAt)
  return !Number.isNaN(endsAt.getTime()) && endsAt.getTime() <= now.getTime()
}

export const isFreeOfferExpired = (pricing, now = new Date()) => {
  if (!pricing?.isFree || !pricing.freeEndsAt) return false
  const endsAt = new Date(pricing.freeEndsAt)
  return !Number.isNaN(endsAt.getTime()) && endsAt.getTime() <= now.getTime()
}

export const isEffectivelyFree = (pricing, now = new Date()) => Boolean(pricing?.isFree && !isFreeOfferExpired(pricing, now))

export const hasCompareAtPrice = (price) => {
  const numeric = Number(price)
  return Number.isFinite(numeric) && numeric > 0
}

export const canOfferFreeExpiration = hasCompareAtPrice

export const getFreeOfferPostExpiryPrice = (compareAtPrice) => {
  const listPrice = Math.max(0, Number(compareAtPrice) || 0)
  return listPrice
}

export const getFreeOfferExpirationInfo = (pricing, now = new Date()) => {
  if (!pricing?.isFree || !pricing.freeEndsAt) return null
  if (isFreeOfferExpired(pricing, now)) return null

  const endsAt = new Date(pricing.freeEndsAt)
  if (Number.isNaN(endsAt.getTime())) return null

  const msLeft = endsAt.getTime() - now.getTime()
  return {
    endsAt,
    endsAtLabel: formatDiscountEndsAt(endsAt),
    isEndingSoon: msLeft > 0 && msLeft <= 48 * 60 * 60 * 1000,
  }
}

export const getEffectiveDiscount = (discount, now = new Date()) => {
  if (!discount?.enabled) {
    return {
      enabled: false,
      type: discount?.type || DISCOUNT_TYPE.PERCENT,
      value: 0,
      endsAt: discount?.endsAt || null,
    }
  }

  if (isDiscountExpired(discount, now)) {
    return {
      enabled: false,
      type: discount.type,
      value: discount.value,
      endsAt: discount.endsAt,
    }
  }

  return discount
}

export const computeSalePrice = (listPrice, discount) => {
  const price = Number(listPrice) || 0
  const effective = getEffectiveDiscount(discount)
  if (!effective?.enabled || price <= 0) return price

  const value = Number(effective.value) || 0
  if (value <= 0) return price

  if (effective.type === DISCOUNT_TYPE.FIXED) {
    return roundCurrency(Math.max(0, price - value))
  }

  const percent = Math.min(100, Math.max(0, value))
  return roundCurrency(price * (1 - percent / 100))
}

export const getCourseSalePrice = (pricing, now = new Date()) => {
  if (!pricing) return 0
  if (pricing.isFree) {
    if (isFreeOfferExpired(pricing, now)) {
      const listPrice = Number(pricing.price) || 0
      return listPrice > 0 ? listPrice : 0
    }
    return 0
  }
  if (Number.isFinite(pricing.salePrice) && pricing.salePrice > 0 && !isDiscountExpired(pricing.discount, now)) {
    const listPrice = Number(pricing.price) || 0
    if (pricing.salePrice < listPrice) return pricing.salePrice
  }
  return computeSalePrice(pricing.price, pricing.discount)
}

export const hasCourseDiscount = (pricing, now = new Date()) => {
  if (!pricing || pricing.isFree) return false
  const listPrice = Number(pricing.price) || 0
  const salePrice = getCourseSalePrice(pricing, now)
  return salePrice > 0 && salePrice < listPrice
}

export const hasFreeCompareAt = (pricing, now = new Date()) => {
  if (!pricing?.isFree || isFreeOfferExpired(pricing, now)) return false
  return Number(pricing.price) > 0
}

export const formatUsd = (amount) => `USD ${Number(amount).toFixed(2)}`

export const formatDiscountEndsAt = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export const getDiscountExpirationInfo = (pricing, now = new Date()) => {
  if (!pricing?.discount?.enabled || !pricing.discount.endsAt) return null
  if (isDiscountExpired(pricing.discount, now)) return null

  const endsAt = new Date(pricing.discount.endsAt)
  if (Number.isNaN(endsAt.getTime())) return null

  const msLeft = endsAt.getTime() - now.getTime()
  return {
    endsAt,
    endsAtLabel: formatDiscountEndsAt(endsAt),
    isEndingSoon: msLeft > 0 && msLeft <= 48 * 60 * 60 * 1000,
  }
}

export const getDiscountSummary = (pricing, now = new Date()) => {
  if (!hasCourseDiscount(pricing, now)) return null

  const listPrice = Number(pricing.price) || 0
  const salePrice = getCourseSalePrice(pricing, now)
  const savings = roundCurrency(listPrice - salePrice)
  const expiration = getDiscountExpirationInfo(pricing, now)

  if (pricing.discount?.type === DISCOUNT_TYPE.PERCENT) {
    return {
      listPrice,
      salePrice,
      savings,
      label: `${pricing.discount.value}% off`,
      expiration,
    }
  }

  return {
    listPrice,
    salePrice,
    savings,
    label: `${formatUsd(savings)} off`,
    expiration,
  }
}

export const previewPricing = ({
  isFree,
  price,
  discountEnabled,
  discountType,
  discountValue,
  discountHasExpiry,
  discountEndsAt,
  freeHasExpiry,
  freeEndsAt,
}) => {
  if (isFree) {
    const listPrice = roundCurrency(clampNonNegativeNumber(price, { allowEmpty: false }))
    const hasCompareAt = listPrice > 0
    const freeEndsAtDate = freeHasExpiry && freeEndsAt ? new Date(freeEndsAt) : null
    const freePricing = {
      isFree: true,
      price: listPrice,
      freeEndsAt: freeEndsAtDate && !Number.isNaN(freeEndsAtDate.getTime()) ? freeEndsAtDate : null,
    }
    const freeOfferExpired = isFreeOfferExpired(freePricing)

    if (freeOfferExpired && listPrice > 0) {
      const salePrice = getFreeOfferPostExpiryPrice(listPrice)
      return {
        listPrice,
        salePrice,
        hasDiscount: false,
        isFreeOffer: false,
        hasCompareAt: false,
        savings: 0,
        label: null,
        expiration: null,
        discountExpired: false,
        freeOfferExpired: true,
      }
    }

    const expiration =
      freePricing.freeEndsAt && !freeOfferExpired
        ? {
            endsAt: freePricing.freeEndsAt,
            endsAtLabel: formatDiscountEndsAt(freePricing.freeEndsAt),
            isEndingSoon: freePricing.freeEndsAt.getTime() - Date.now() <= 48 * 60 * 60 * 1000,
          }
        : null

    return {
      listPrice,
      salePrice: 0,
      hasDiscount: false,
      isFreeOffer: true,
      hasCompareAt,
      savings: hasCompareAt ? listPrice : 0,
      label: hasCompareAt ? '100% off' : null,
      expiration,
      discountExpired: false,
      freeOfferExpired: false,
    }
  }

  const listPrice = clampNonNegativeNumber(price, { allowEmpty: false })
  const endsAt = discountHasExpiry && discountEndsAt ? new Date(discountEndsAt) : null
  const discount = discountEnabled
    ? {
        enabled: true,
        type: discountType === DISCOUNT_TYPE.FIXED ? DISCOUNT_TYPE.FIXED : DISCOUNT_TYPE.PERCENT,
        value: Math.max(0, Number(discountValue) || 0),
        endsAt: endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt : null,
      }
    : { enabled: false, type: DISCOUNT_TYPE.PERCENT, value: 0, endsAt: null }

  const discountExpired = isDiscountExpired(discount)
  const salePrice = computeSalePrice(listPrice, discount)
  const hasDiscount = discount.enabled && !discountExpired && salePrice > 0 && salePrice < listPrice
  const savings = hasDiscount ? roundCurrency(listPrice - salePrice) : 0
  const label = hasDiscount ? (discount.type === DISCOUNT_TYPE.PERCENT ? `${discount.value}% off` : `${formatUsd(discount.value)} off`) : null
  const expiration =
    hasDiscount && discount.endsAt
      ? {
          endsAt: discount.endsAt,
          endsAtLabel: formatDiscountEndsAt(discount.endsAt),
          isEndingSoon: discount.endsAt.getTime() - Date.now() <= 48 * 60 * 60 * 1000,
        }
      : null

  return {
    listPrice,
    salePrice: hasDiscount ? salePrice : listPrice,
    hasDiscount,
    isFreeOffer: false,
    hasCompareAt: false,
    savings,
    label,
    expiration,
    discountExpired: discount.enabled && discountExpired,
    freeOfferExpired: false,
  }
}

export const getDiscountValueBounds = (listPrice, discountType) => {
  const price = clampNonNegativeNumber(listPrice, { allowEmpty: false })

  if (price <= MIN_PAID_COURSE_PRICE) {
    return {
      min: 0,
      max: 0,
      canDiscount: false,
      hint: `Discounts require a list price above ${formatUsd(MIN_PAID_COURSE_PRICE)}.`,
    }
  }

  if (discountType === DISCOUNT_TYPE.FIXED) {
    const max = Math.floor(price - MIN_PAID_COURSE_PRICE)
    return {
      min: MIN_DISCOUNT_VALUE,
      max,
      canDiscount: max >= MIN_DISCOUNT_VALUE,
      hint: `Enter a whole number between ${MIN_DISCOUNT_VALUE} and ${max}.`,
    }
  }

  const max = Math.min(99, Math.floor((1 - MIN_PAID_COURSE_PRICE / price) * 100))
  return {
    min: 1,
    max,
    canDiscount: max >= 1,
    hint: `Enter between 1% and ${max}%.`,
  }
}

export const clampDiscountValue = (listPrice, discountType, discountValue) => {
  const bounds = getDiscountValueBounds(listPrice, discountType)
  if (!bounds.canDiscount) return 0

  const value = Number(discountValue)
  if (!Number.isFinite(value) || value <= 0) return bounds.min
  if (value < bounds.min) return bounds.min
  if (value > bounds.max) return bounds.max
  return discountType === DISCOUNT_TYPE.PERCENT ? Math.round(value) : Math.floor(value)
}

export const getPublicPriceDisplay = (pricing, now = new Date()) => {
  if (!pricing) {
    return {
      isFree: true,
      primaryLabel: 'Free',
      compareAt: null,
      savings: null,
      promoLabel: null,
      expirationLabel: null,
    }
  }

  if (pricing.isFree) {
    if (isFreeOfferExpired(pricing, now)) {
      const listPrice = Number(pricing.price) || 0
      if (listPrice > 0) {
        return {
          isFree: false,
          primaryLabel: formatUsd(listPrice),
          compareAt: null,
          savings: null,
          promoLabel: null,
          expirationLabel: null,
        }
      }
    }

    const compareAt = Number(pricing.price) > 0 ? roundCurrency(Number(pricing.price)) : null
    const freeExpiration = getFreeOfferExpirationInfo(pricing, now)
    return {
      isFree: true,
      primaryLabel: 'Free',
      compareAt,
      savings: compareAt,
      promoLabel: compareAt ? '100% off' : null,
      expirationLabel: freeExpiration ? `Free offer ends ${freeExpiration.endsAtLabel}` : null,
    }
  }

  const discount = getDiscountSummary(pricing, now)
  if (discount) {
    return {
      isFree: false,
      primaryLabel: formatUsd(discount.salePrice),
      compareAt: discount.listPrice,
      savings: discount.savings,
      promoLabel: discount.label,
      expirationLabel: discount.expiration ? `Offer ends ${discount.expiration.endsAtLabel}` : null,
    }
  }

  return {
    isFree: false,
    primaryLabel: formatUsd(pricing.price),
    compareAt: null,
    savings: null,
    promoLabel: null,
    expirationLabel: null,
  }
}

export { DISCOUNT_TYPE, MIN_PAID_COURSE_PRICE }
