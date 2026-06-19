import { lazy, Suspense } from 'react'
import FallbackLoading from '@/components/FallbackLoading'
import Footer from '@/components/layout/Footer'
import Preloader from '@/components/Preloader'
import useRoleBasedLayout from '@/hooks/useRoleBasedLayout'

const TopNavigationBar = lazy(() => import('@/components/layout/TopNavigationBar'))
const VerticalNavigationBar = lazy(() => import('@/components/layout/VerticalNavigationBar'))

const AdminLayout = ({ children }) => {
  const { showSidebar } = useRoleBasedLayout()

  return (
    <div className="wrapper">
      <Suspense fallback={<FallbackLoading />}>
        <TopNavigationBar />
      </Suspense>

      {showSidebar && (
        <Suspense fallback={<FallbackLoading />}>
          <VerticalNavigationBar />
        </Suspense>
      )}

      <div className="page-content">
        <div className="container-xxl">
          <Suspense fallback={<Preloader />}>{children}</Suspense>
        </div>

        <Footer />
      </div>
    </div>
  )
}
export default AdminLayout
