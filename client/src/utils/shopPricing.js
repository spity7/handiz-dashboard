/** Mirrors server/utils/shopPricing.js — keep in sync for admin previews. */

const roundCurrency = (amount) => Math.round(amount * 100) / 100

export const resolveProductPricing = (product) => {
  const listPrice = Number(product?.price) || 0
  const manualSale = Number(product?.salePrice) || 0
  let unitPrice = listPrice

  if (manualSale > 0 && manualSale < listPrice) {
    unitPrice = roundCurrency(manualSale)
  }

  return {
    listPrice,
    unitPrice: roundCurrency(unitPrice),
    currency: product?.currency || 'USD',
  }
}
