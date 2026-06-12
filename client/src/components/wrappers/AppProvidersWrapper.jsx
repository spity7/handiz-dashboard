import { useEffect } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ToastContainer } from 'react-toastify'
import { DEFAULT_PAGE_TITLE } from '@/context/constants'
import { AuthProvider } from '@/context/useAuthContext'
import { LayoutProvider } from '@/context/useLayoutContext'
import { NotificationProvider } from '@/context/useNotificationContext'
import { HelmetProvider } from 'react-helmet-async'
import { GlobalProvider } from '@/context/useGlobalContext'
import { GOOGLE_CLIENT_ID } from '@/config/api'
const handleChangeTitle = () => {
  if (document.visibilityState == 'hidden') document.title = 'Please come back 🥺'
  else document.title = DEFAULT_PAGE_TITLE
}
const AppProvidersWrapper = ({ children }) => {
  useEffect(() => {
    document.addEventListener('visibilitychange', handleChangeTitle)
    return () => {
      document.removeEventListener('visibilitychange', handleChangeTitle)
    }
  }, [])
  const appTree = (
    <AuthProvider>
      <GlobalProvider>
        <LayoutProvider>
          <NotificationProvider>
            {children}
            <ToastContainer theme="colored" />
          </NotificationProvider>
        </LayoutProvider>
      </GlobalProvider>
    </AuthProvider>
  )

  return (
    <HelmetProvider>{GOOGLE_CLIENT_ID ? <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{appTree}</GoogleOAuthProvider> : appTree}</HelmetProvider>
  )
}
export default AppProvidersWrapper
