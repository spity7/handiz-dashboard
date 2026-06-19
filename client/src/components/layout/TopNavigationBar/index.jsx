import { lazy } from 'react'
import { Suspense } from 'react'
import LogoBox from '@/components/LogoBox'
import { ROLES } from '@/constants/roles'
import { useAuthContext } from '@/context/useAuthContext'
import { useLayoutContext } from '@/context/useLayoutContext'
import ActivityStreamToggle from './components/ActivityStreamToggle'
import HandizWebsiteLink from './components/HandizWebsiteLink'
import LeftSideBarToggle from './components/LeftSideBarToggle'
import ProfileDropdown from './components/ProfileDropdown'
import SearchBox from './components/SearchBox'
import ThemeCustomizerToggle from './components/ThemeCustomizerToggle'
import ThemeModeToggle from './components/ThemeModeToggle'

const AppsDropdown = lazy(() => import('./components/AppsDropdown'))
const Notifications = lazy(() => import('./components/Notifications'))

const TopNavigationBar = () => {
  const { user } = useAuthContext()
  const {
    menu: { size },
  } = useLayoutContext()
  const isUserRole = user?.role === ROLES.USER

  return (
    <header className="topbar">
      <div className="container-xxl">
        <div className="navbar-header">
          <div className="d-flex align-items-center gap-3">
            {!isUserRole && size === 'hidden' && <LeftSideBarToggle />}
            {(isUserRole || size === 'hidden') && <LogoBox containerClassName="topbar-logo" textLogo={{ height: 40, width: 100 }} />}

            {/* <SearchBox /> */}
          </div>
          <div className="d-flex align-items-center gap-lg-4">
            <HandizWebsiteLink />

            <div className="d-flex align-items-center gap-lg-1">
              {/* Toggle Theme Mode */}
              <ThemeModeToggle />

              {/* Apps Dropdown */}
              {/* <Suspense>
              <AppsDropdown />
            </Suspense> */}

              {/* Notification Dropdown */}
              <Suspense>
                <Notifications />
              </Suspense>

              {/* Toggle for Theme Customizer */}
              {/* <ThemeCustomizerToggle /> */}

              {/* Toggle for Activity Stream */}
              {/* <ActivityStreamToggle /> */}

              {/* Admin Profile Dropdown */}
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
export default TopNavigationBar
