import { LMS_SITE_URL } from '@/config/api'

const LMS_PATH_PREFIXES = ['/courses', '/my-courses']

function normalizeLmsPath(path) {
  const learnOnlyMatch = path.match(/^\/courses\/([^/]+)\/learn\/?$/)
  if (learnOnlyMatch) {
    return `/courses/${learnOnlyMatch[1]}`
  }
  return path
}

export function isLmsNotificationLink(link) {
  if (!link) return false

  const path = normalizeLmsPath(link.startsWith('/') ? link : `/${link}`)

  if (/^https?:\/\//i.test(link)) {
    try {
      return new URL(link).origin === new URL(LMS_SITE_URL).origin
    } catch {
      return false
    }
  }

  return LMS_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`))
}

export function resolveNotificationLink(link) {
  if (!link) return null

  if (/^https?:\/\//i.test(link)) {
    return link
  }

  const path = normalizeLmsPath(link.startsWith('/') ? link : `/${link}`)

  if (isLmsNotificationLink(path)) {
    return `${LMS_SITE_URL.replace(/\/$/, '')}${path}`
  }

  return path
}

export function navigateToNotificationLink(link, navigate) {
  const resolved = resolveNotificationLink(link)
  if (!resolved) return

  if (/^https?:\/\//i.test(resolved)) {
    window.location.assign(resolved)
    return
  }

  if (navigate) {
    navigate(resolved)
  }
}
