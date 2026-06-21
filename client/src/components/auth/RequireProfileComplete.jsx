import { Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '@/context/useAuthContext'
import { isProfileComplete } from '@/utils/profileComplete'

const RequireProfileComplete = ({ children }) => {
  const { user, loading } = useAuthContext()
  const location = useLocation()

  if (loading) return null

  if (!isProfileComplete(user)) {
    return <Navigate to="/pages/account" state={{ from: location.pathname }} replace />
  }

  return children
}

export default RequireProfileComplete
