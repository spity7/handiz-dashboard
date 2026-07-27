const EMPTY_RICH_TEXT = new Set(['', '<p><br></p>', '<p><br/></p>', '<br>', '<br/>'])

export const normalizeRichTextForCompare = (value) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed || EMPTY_RICH_TEXT.has(trimmed)) return ''
  const textOnly = trimmed.replace(/<[^>]*>/g, '').trim()
  if (!textOnly) return ''
  return value
}

const normalizeScalar = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : ''
  if (typeof value === 'string') {
    const rich = normalizeRichTextForCompare(value)
    if (rich === '') return ''
    const trimmed = rich.trim()
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
    return rich
  }
  return value
}

export const normalizeForDirtyCompare = (value) => {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value) && value.length === 0) return []
  if (typeof value === 'boolean' || typeof value === 'number') return normalizeScalar(value)
  if (typeof value === 'string') return normalizeScalar(value)
  if (Array.isArray(value)) {
    const items = value.map((item) => normalizeForDirtyCompare(item))
    if (items.every((item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')) {
      return [...items].map(String).sort()
    }
    return items
  }
  if (typeof value === 'object') {
    const normalized = {}
    for (const key of Object.keys(value).sort()) {
      normalized[key] = normalizeForDirtyCompare(value[key])
    }
    return normalized
  }
  return value
}

export const formsDiffer = (snapshot, current) => {
  if (snapshot == null && current == null) return false
  if (snapshot == null || current == null) return true
  try {
    const keys = [...new Set([...Object.keys(snapshot), ...Object.keys(current)])].sort()
    const left = {}
    const right = {}
    for (const key of keys) {
      left[key] = snapshot[key]
      right[key] = current[key]
    }
    return JSON.stringify(normalizeForDirtyCompare(left)) !== JSON.stringify(normalizeForDirtyCompare(right))
  } catch {
    return false
  }
}
