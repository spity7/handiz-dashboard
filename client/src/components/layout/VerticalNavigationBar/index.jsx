import { lazy, Suspense } from 'react'
import clsx from 'clsx'
import FallbackLoading from '@/components/FallbackLoading'
import LogoBox from '@/components/LogoBox'
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient'
import { getMenuItems } from '@/helpers/menu'
import { useAuthContext } from '@/context/useAuthContext'
import { useLmsAsyncBusyContext } from '@/context/LmsAsyncBusyContext'
import HoverMenuToggle from './components/HoverMenuToggle'

const AppMenu = lazy(() => import('./components/AppMenu'))

const VerticalNavigationBar = () => {
  const { user } = useAuthContext()
  const { isAsyncBusy } = useLmsAsyncBusyContext()
  const menuItems = getMenuItems(user?.role)

  return (
    <div className={clsx('main-nav', isAsyncBusy && 'main-nav--async-busy')} id="leftside-menu-container" aria-busy={isAsyncBusy || undefined}>
      <LogoBox
        containerClassName="logo-box"
        squareLogo={{
          className: 'logo-sm',
        }}
        textLogo={{
          height: 70,
          width: 180,
          // className: 'logo-lg',
        }}
      />

      <HoverMenuToggle />

      <SimplebarReactClient className="scrollbar">
        <Suspense fallback={<FallbackLoading />}>
          <AppMenu menuItems={menuItems} />
        </Suspense>
      </SimplebarReactClient>
    </div>
  )
}
export default VerticalNavigationBar
