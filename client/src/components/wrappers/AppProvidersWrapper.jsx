import { useEffect } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { DEFAULT_PAGE_TITLE } from '@/context/constants'
import { AuthProvider } from '@/context/useAuthContext'
import { LayoutProvider } from '@/context/useLayoutContext'
import { HelmetProvider } from 'react-helmet-async'
import { GlobalProvider } from '@/context/useGlobalContext'
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
          {children}
          <ToastContainer theme="colored" position="top-end" autoClose={3000} />
        </LayoutProvider>
      </GlobalProvider>
    </AuthProvider>
  )

  return <HelmetProvider>{appTree}</HelmetProvider>
}
export default AppProvidersWrapper
