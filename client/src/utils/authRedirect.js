import { ALLOWED_RETURN_ORIGINS } from '@/config/api'

export const AUTH_REDIRECT_KEY = 'auth-redirect-to'

let postAuthRedirectStarted = false

export function isAllowedRedirectTarget(target) {
  if (!target || typeof target !== 'string') return false

  if (target.startsWith('/') && !target.startsWith('//')) {
    return true
  }

  try {
    const parsed = new URL(target)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false
    }

    return ALLOWED_RETURN_ORIGINS.includes(parsed.origin)
  } catch {
    return false
  }
}

export function storeAuthRedirect(target) {
  if (!isAllowedRedirectTarget(target)) return
  postAuthRedirectStarted = false
  sessionStorage.setItem(AUTH_REDIRECT_KEY, target)
}

export function getStoredAuthRedirect() {
  const stored = sessionStorage.getItem(AUTH_REDIRECT_KEY)
  return isAllowedRedirectTarget(stored) ? stored : null
}

export function clearStoredAuthRedirect() {
  sessionStorage.removeItem(AUTH_REDIRECT_KEY)
}

export function captureAuthRedirectFromSearch(searchParams) {
  const redirectTo = searchParams?.get?.('redirectTo')
  if (redirectTo) {
    storeAuthRedirect(redirectTo)
  }
}

export function buildAuthLink(path, searchParams) {
  const redirectTo = searchParams?.get?.('redirectTo') || getStoredAuthRedirect()

  if (!redirectTo) return path

  return `${path}?redirectTo=${encodeURIComponent(redirectTo)}`
}

export function resolvePostAuthRedirect(fallback = '/') {
  const stored = getStoredAuthRedirect()
  if (stored) {
    clearStoredAuthRedirect()
    return stored
  }

  return fallback
}

export function completeAuthRedirect(fallback = '/') {
  captureAuthRedirectFromSearch(new URLSearchParams(window.location.search))
  redirectAfterAuth(fallback)
}

export function redirectAfterAuth(fallback = '/') {
  if (postAuthRedirectStarted) return
  postAuthRedirectStarted = true

  const target = resolvePostAuthRedirect(fallback)
  window.location.href = target
}
