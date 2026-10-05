export const HOMEPAGE_AD_STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'coming_soon', label: 'Coming Soon' },
  { value: 'sold_out', label: 'Sold Out' },
  { value: 'limited', label: 'Limited' },
]

export const HOMEPAGE_AD_STATUS_LABELS = Object.fromEntries(HOMEPAGE_AD_STATUS_OPTIONS.map((o) => [o.value, o.label]))

/** Bootstrap badge variant for admin table */
export function homepageAdStatusBadgeVariant(status) {
  switch (status) {
    case 'available':
      return 'success'
    case 'coming_soon':
      return 'warning'
    case 'sold_out':
      return 'danger'
    case 'limited':
      return 'info'
    default:
      return 'secondary'
  }
}

/** CSS class for storefront-style preview in admin */
export function homepageAdStatusPreviewClass(status) {
  return `homepage-ad-status homepage-ad-status--${status || 'available'}`
}
