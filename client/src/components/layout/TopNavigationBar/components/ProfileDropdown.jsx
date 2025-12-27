import { Link } from 'react-router-dom'
import { Dropdown, DropdownDivider, DropdownHeader, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import avatar1 from '@/assets/images/users/avatar-1.jpg'
import { useAuthContext } from '@/context/useAuthContext'
import { useState, useEffect } from 'react'

const ProfileDropdown = () => {
  const { handleLogout, user, isAuthenticated } = useAuthContext()
  const [auth, setAuth] = useState(!!isAuthenticated)

  useEffect(() => {
    // initialize based on context/localStorage
    const stored = localStorage.getItem('user-app')
    if (!stored) {
      setAuth(false)
      return
    }
    try {
      const parsed = JSON.parse(stored)
      if (parsed?.expiry && Date.now() > parsed.expiry) {
        localStorage.removeItem('user-app')
        setAuth(false)
      } else {
        setAuth(true)
      }
    } catch {
      localStorage.removeItem('user-app')
      setAuth(false)
    }
  }, [])

  useEffect(() => {
    const checkAuth = () => {
      setAuth(!!localStorage.getItem('user-app'))
    }

    // custom same-tab event
    const logoutListener = () => {
      checkAuth()
    }
    window.addEventListener('logout', logoutListener)

    // cross-tab logout detection
    const storageListener = (e) => {
      if (e.key === 'logout-event') {
        checkAuth()
      }
    }
    window.addEventListener('storage', storageListener)

    return () => {
      window.removeEventListener('logout', logoutListener)
      window.removeEventListener('storage', storageListener)
    }
  }, [])

  return (
    <Dropdown className="topbar-item" align={'end'}>
      <DropdownToggle
        as="button"
        type="button"
        className="topbar-button content-none"
        id="page-header-user-dropdown"
        data-bs-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false">
        <span className="d-flex align-items-center">
          <img className="rounded-circle" width={32} height={32} src={avatar1} alt="avatar-3" />
        </span>
      </DropdownToggle>
      <DropdownMenu>
        <DropdownHeader as="h6">Welcome {user?.firstname || user?.username || 'Guest'}!</DropdownHeader>
        {/* <DropdownItem as={Link} to="/pages/profile">
          <IconifyIcon icon="bx:user-circle" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">Profile</span>
        </DropdownItem>
        <DropdownItem as={Link} to="/apps/chat">
          <IconifyIcon icon="bx:message-dots" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">Messages</span>
        </DropdownItem>
        <DropdownItem as={Link} to="/pages/pricing">
          <IconifyIcon icon="bx:wallet" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">Pricing</span>
        </DropdownItem>
        <DropdownItem as={Link} to="/pages/faqs">
          <IconifyIcon icon="bx:help-circle" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">Help</span>
        </DropdownItem>
        <DropdownItem as={Link} to="/auth/lock-screen">
          <IconifyIcon icon="bx:lock" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">Lock screen</span>
        </DropdownItem> */}
        <DropdownDivider className="dropdown-divider my-1" />
        <DropdownItem
          as="button"
          className="text-danger"
          onClick={(e) => {
            e.preventDefault()
            handleLogout()
          }}>
          <IconifyIcon icon="bx:log-out" className="fs-18 align-middle me-1" />
          <span className="align-middle">Logout</span>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}
export default ProfileDropdown
