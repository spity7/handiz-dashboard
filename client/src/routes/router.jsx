import { Navigate, Route, Routes } from 'react-router-dom'
import AuthLayout from '@/layouts/AuthLayout'
import { useAuthContext } from '@/context/useAuthContext'
import { appRoutes, authRoutes } from '@/routes/index'
import AdminLayout from '@/layouts/AdminLayout'

const AppRouter = (props) => {
  const { isAuthenticated } = useAuthContext()

  return (
    <Routes>
      {(authRoutes || []).map((route, idx) => (
        <Route
          key={idx + route.name}
          path={route.path}
          element={
            // If already authenticated, redirect away from auth pages to home (or route.redirectTo)
            isAuthenticated ? <Navigate to={route.redirectTo || '/'} replace /> : <AuthLayout {...props}>{route.element}</AuthLayout>
          }
        />
      ))}

      {(appRoutes || []).map((route, idx) => (
        <Route
          key={idx + route.name}
          path={route.path}
          element={
            isAuthenticated ? (
              <AdminLayout {...props}>{route.element}</AdminLayout>
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
