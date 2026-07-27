import { normalizeRichTextForCompare } from '@/utils/formDirtyCompare'

const normalizeFileField = (value) => {
  if (value == null) return null
  if (typeof FileList !== 'undefined' && value instanceof FileList) return value.length > 0 ? '__file__' : null
  if (typeof File !== 'undefined' && value instanceof File) return '__file__'
  if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) return '__file__'
  return value
}

/** RHF watch() may omit keys or use undefined; treat those as defaultValues. */
export const mergeFormWithDefaults = (defaults, values) => {
  const merged = { ...defaults }
  if (!values || typeof values !== 'object') return merged
  for (const key of Object.keys(values)) {
    if (values[key] !== undefined) merged[key] = values[key]
  }
  return merged
}

export const prepareFieldValue = (value, defaultValue) => {
  let resolved = value === undefined ? defaultValue : value

  const fileNormalized = normalizeFileField(resolved)
  if (fileNormalized !== resolved) return fileNormalized

  if (typeof defaultValue === 'number') {
    if (resolved === '' || resolved === null || resolved === undefined) return defaultValue
    const num = Number(resolved)
    return Number.isFinite(num) ? num : resolved
  }

  if (typeof defaultValue === 'string' || typeof resolved === 'string') {
    const str = resolved == null ? '' : String(resolved)
    const rich = normalizeRichTextForCompare(str)
    return rich === '' ? '' : rich
  }

  if (Array.isArray(defaultValue)) {
    if (resolved == null) return []
    return resolved
  }

  return resolved
}

export const pickComparableFormValues = (source, keys, defaults) => {
  const comparable = {}
  for (const key of keys) {
    comparable[key] = prepareFieldValue(source?.[key], defaults[key])
  }
  return comparable
}
