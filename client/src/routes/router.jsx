import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AuthLayout from '@/layouts/AuthLayout'
import { useAuthContext } from '@/context/useAuthContext'
import { appRoutes, authRoutes } from '@/routes/index'
import AdminLayout from '@/layouts/AdminLayout'
import FallbackLoading from '@/components/FallbackLoading'
import { canAccessRoute } from '@/utils/routeAccess'

const AppRouter = (props) => {
  const { isAuthenticated, user, loading } = useAuthContext()
  const location = useLocation()

  if (loading) {
    return <FallbackLoading />
  }

  return (
    <Routes>
      {(authRoutes || []).map((route, idx) => (
        <Route
          key={idx + route.name}
          path={route.path}
          element={isAuthenticated ? <Navigate to={route.redirectTo || '/'} replace /> : <AuthLayout {...props}>{route.element}</AuthLayout>}
        />
      ))}

      {(appRoutes || []).map((route, idx) => (
        <Route
          key={idx + route.name}
          path={route.path}
          element={
            isAuthenticated ? (
              canAccessRoute(user?.role, route.path) ? (
                <AdminLayout {...props}>{route.element}</AdminLayout>
              ) : (
                <Navigate to="/pages/unauthorized" replace state={{ from: location }} />
              )
            ) : (
              <Navigate
                to={{
                  pathname: '/auth/sign-in',
                  search: 'redirectTo=' + route.path,
                }}
              />
            )
          }
        />
      ))}
    </Routes>
  )
}
export default AppRouter
