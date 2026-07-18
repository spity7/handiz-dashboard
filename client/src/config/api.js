const DEFAULT_ALLOWED_RETURN_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://handiz.org',
  'https://www.handiz.org',
  'https://learn.handiz.org',
]

function parseCommaSeparatedOrigins(value) {
  if (!value) return []

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function resolveAllowedReturnOrigins() {
  const fromEnv = parseCommaSeparatedOrigins(import.meta.env.VITE_ALLOWED_RETURN_ORIGINS)

  return [...new Set([...DEFAULT_ALLOWED_RETURN_ORIGINS, ...fromEnv])]
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5016/api/v1/'

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

/** Public Handiz marketing site (handiz.org). */
export const HANDIZ_WEBSITE_URL = import.meta.env.VITE_HANDIZ_WEBSITE_URL || 'https://handiz.org'

/** Origins allowed for post-login redirects back to the public Handiz site. */
export const ALLOWED_RETURN_ORIGINS = resolveAllowedReturnOrigins()
