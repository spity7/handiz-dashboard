import { ROLES } from '@/constants/roles'

const ADMIN_ONLY_PREFIXES = [
  '/ecommerce/competitions',
  '/ecommerce/aiTools',
  '/ecommerce/offices',
  '/pages/about-us',
  '/pages/user-requests',
  '/ecommerce/services',
  '/dashboard/',
]

const ADMIN_EDITOR_PREFIXES = [
  '/ecommerce/student-projects/concepts',
  '/ecommerce/student-projects/types',
  '/ecommerce/student-projects/categories',
  '/ecommerce/student-projects/years',
  '/ecommerce/student-projects/locations',
  '/ecommerce/student-projects/universities',
  '/pages/users',
]

export function getAllowedRolesForPath(path) {
  const p = path?.split('?')[0] ?? ''
  if (ADMIN_ONLY_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`) || p.startsWith(prefix))) {
    return [ROLES.ADMIN]
  }
  if (ADMIN_EDITOR_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`))) {
    return [ROLES.ADMIN, ROLES.EDITOR]
  }
  if (p.startsWith('/pages/users')) {
    return [ROLES.ADMIN, ROLES.EDITOR]
  }
  return null
}

export function canAccessRoute(userRole, path) {
  const allowed = getAllowedRolesForPath(path)
  if (!allowed) return true
  return allowed.includes(userRole)
}
