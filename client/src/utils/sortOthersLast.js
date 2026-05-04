const isOthersLabel = (name) =>
  String(name ?? '')
    .trim()
    .toLowerCase() === 'others'

/**
 * Stable sort: items named "Others" (case-insensitive) render last; other items keep relative order.
 */
export function sortOthersLast(items) {
  if (!Array.isArray(items)) return []
  return [...items].sort((a, b) => {
    const ao = isOthersLabel(a?.name)
    const bo = isOthersLabel(b?.name)
    if (ao === bo) return 0
    return ao ? 1 : -1
  })
}
