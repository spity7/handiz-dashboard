import { Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '@/context/useAuthContext'
import { canManageCms } from '@/constants/roles'
import FallbackLoading from '@/components/FallbackLoading'

/**
 * CMS admin-only pages (homepage ads, about us, etc.).
 * Mirrors server protectCmsWrite / cms:manage checks.
 */
const RequireCmsManage = ({ children }) => {
  const { user, loading } = useAuthContext()
  const location = useLocation()

  if (loading) {
    return <FallbackLoading />
  }

  if (!canManageCms(user)) {
    return <Navigate to="/pages/unauthorized" replace state={{ from: location }} />
  }

  return children
}

export default RequireCmsManage
