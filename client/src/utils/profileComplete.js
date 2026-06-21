export function splitMobileFields(user) {
  if (user?.mobileCountryCode && user?.mobileNumber) {
    return {
      mobileCountryCode: user.mobileCountryCode,
      mobileNumber: user.mobileNumber,
    }
  }

  const combined = (user?.mobileNumber || '').replace(/[\s-]/g, '')
  if (!combined) {
    return { mobileCountryCode: '', mobileNumber: '' }
  }

  const match = combined.match(/^(\+\d{1,4})(\d{4,12})$/)
  if (match) {
    return { mobileCountryCode: match[1], mobileNumber: match[2] }
  }

  if (combined.startsWith('+')) {
    return { mobileCountryCode: '', mobileNumber: combined.slice(1) }
  }

  return { mobileCountryCode: '', mobileNumber: combined }
}

export function getWhatsAppPhoneDigits(user) {
  const { mobileCountryCode, mobileNumber } = splitMobileFields(user)
  if (mobileCountryCode && mobileNumber) {
    const codeDigits = mobileCountryCode.replace(/\D/g, '')
    const numberDigits = mobileNumber.replace(/\D/g, '')
    if (codeDigits && numberDigits) return `${codeDigits}${numberDigits}`
  }

  const combined = (user?.mobileNumber || '').replace(/[\s-]/g, '')
  const legacyMatch = combined.match(/^\+?(\d{1,4})(\d{4,12})$/)
  if (legacyMatch) return `${legacyMatch[1]}${legacyMatch[2]}`

  return null
}

export function getWhatsAppUrl(user, message) {
  const phone = getWhatsAppPhoneDigits(user)
  if (!phone) return null

  const base = `https://wa.me/${phone}`
  const text = message?.trim()
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

export function getInstagramUrl(user) {
  const raw = user?.instagramUrl?.trim()
  if (!raw) return null

  if (/^@?[\w.]+$/.test(raw) && !raw.includes('/')) {
    return `https://instagram.com/${raw.replace(/^@/, '')}`
  }

  if (/^https?:\/\//i.test(raw)) return raw
  if (/^instagram\.com/i.test(raw)) return `https://${raw.replace(/^www\./i, '')}`

  return raw
}

export function formatMobileDisplay(user) {
  const { mobileCountryCode, mobileNumber } = splitMobileFields(user)
  if (!mobileCountryCode && !mobileNumber) return '—'
  if (mobileCountryCode && mobileNumber) return `${mobileCountryCode} ${mobileNumber}`
  return mobileNumber || mobileCountryCode
}

export function hasCompleteMobile(user) {
  const code = user?.mobileCountryCode?.trim()
  const number = user?.mobileNumber?.trim()

  if (code && number) {
    const codeDigits = code.replace(/[\s-+]/g, '')
    const numberDigits = number.replace(/[\s-]/g, '')
    return /^\d{1,4}$/.test(codeDigits) && /^\d{4,12}$/.test(numberDigits)
  }

  const combined = (user?.mobileNumber || '').replace(/[\s-]/g, '')
  return /^\+\d{1,4}\d{4,12}$/.test(combined)
}

export function isProfileComplete(user) {
  if (user?.isProfileComplete === true) return true
  return Boolean(hasCompleteMobile(user) && user?.instagramUrl?.trim())
}

export const mobileCountryCodeSchema = (yup) =>
  yup
    .string()
    .required('Please enter the country code')
    .test('valid-code', 'Enter a valid code (e.g. 961 or +961)', (value) => {
      if (!value?.trim()) return false
      const digits = value.replace(/[\s-+]/g, '')
      return /^\d{1,4}$/.test(digits)
    })

export const mobileLocalNumberSchema = (yup) =>
  yup
    .string()
    .required('Please enter your mobile number')
    .test('valid-number', 'Enter 4–12 digits', (value) => {
      if (!value) return false
      const normalized = value.replace(/[\s-]/g, '')
      return /^\d{4,12}$/.test(normalized)
    })

export const instagramUrlSchema = (yup) =>
  yup
    .string()
    .required('Please enter your Instagram URL or username')
    .test('valid-instagram', 'Enter a valid Instagram URL or @username', (value) => {
      if (!value?.trim()) return false
      const trimmed = value.trim()
      if (/^@?[\w.]+$/.test(trimmed) && !trimmed.includes('/')) return true
      try {
        const normalized = trimmed.match(/^https?:\/\//i) ? trimmed : trimmed.match(/^instagram\.com/i) ? `https://${trimmed}` : trimmed
        const url = new URL(normalized)
        const host = url.hostname.replace(/^www\./, '')
        return host === 'instagram.com' && url.pathname.length > 1
      } catch {
        return false
      }
    })
