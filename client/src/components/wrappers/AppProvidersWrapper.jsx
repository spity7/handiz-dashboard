import { useEffect } from 'react'
import 'react-toastify/dist/ReactToastify.css'
import { DEFAULT_PAGE_TITLE } from '@/context/constants'
import { AuthProvider } from '@/context/useAuthContext'
import { LayoutProvider } from '@/context/useLayoutContext'
import { HelmetProvider } from 'react-helmet-async'
import { GlobalProvider } from '@/context/useGlobalContext'
import { UnsavedFormChangesProvider } from '@/context/UnsavedFormChangesContext'
import { LmsAsyncBusyProvider } from '@/context/LmsAsyncBusyContext'
import UnsavedChangesBlocker from '@/components/UnsavedChangesBlocker'
import AsyncActionOverlay from '@/components/AsyncActionOverlay'
import AppToastContainer from '@/components/AppToastContainer'

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
        <UnsavedFormChangesProvider>
          <LmsAsyncBusyProvider>
            <LayoutProvider>
              {children}
              <UnsavedChangesBlocker />
              <AsyncActionOverlay />
              <AppToastContainer />
            </LayoutProvider>
          </LmsAsyncBusyProvider>
        </UnsavedFormChangesProvider>
      </GlobalProvider>
    </AuthProvider>
  )

  return <HelmetProvider>{appTree}</HelmetProvider>
}
export default AppProvidersWrapper
