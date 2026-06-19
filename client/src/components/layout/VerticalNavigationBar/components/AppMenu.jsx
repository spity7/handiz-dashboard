import clsx from 'clsx'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Collapse } from 'react-bootstrap'
import { Link, useLocation } from 'react-router-dom'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { findAllParent, getActiveKeysForPathname, getMenuItemFromURL, itemSubmenuShouldOpen } from '@/helpers/menu'

const MenuItemWithChildren = ({
  item,
  className,
  linkClassName,
  subMenuClassName,
  activeMenuItems,
  toggleMenu,
  matchingMenuItem,
  menuItems,
  pathname,
}) => {
  const routeWantsOpen = itemSubmenuShouldOpen(item, pathname, matchingMenuItem, menuItems, activeMenuItems)

  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (routeWantsOpen) setOpen(true)
  }, [routeWantsOpen])

  const toggleMenuItem = (e) => {
    e.preventDefault()
    const status = !open
    setOpen(status)
    if (toggleMenu) toggleMenu(item, status)
    return false
  }

  const getActiveClass = useCallback(
    (item) => {
      return activeMenuItems?.includes(item.key) ? 'active' : ''
    },
    [activeMenuItems],
  )

  return (
    <li className={className}>
      <div className="d-flex align-items-center justify-content-between">
        {item.url ? (
          <Link to={item.url} className={clsx(linkClassName, 'd-flex align-items-center')}>
            {item.icon && (
              <span className="nav-icon">
                <IconifyIcon icon={item.icon} />
              </span>
            )}
            <span className="nav-text">{item.label}</span>
          </Link>
        ) : (
          <div onClick={toggleMenuItem} aria-expanded={open} role="button" className={clsx(linkClassName)}>
            {item.icon && (
              <span className="nav-icon">
                <IconifyIcon icon={item.icon} />
              </span>
            )}
            <span className="nav-text">{item.label}</span>
          </div>
        )}

        <button type="button" className="btn btn-icon btn-sm" onClick={toggleMenuItem} aria-expanded={open} aria-label="Toggle submenu">
          <IconifyIcon icon="bx:chevron-down" className="menu-arrow" />
        </button>
      </div>
      <Collapse in={open}>
        <div>
          <ul className={clsx(subMenuClassName)}>
            {(item.children || []).map((child, idx) => {
              return (
                <Fragment key={child.key + idx}>
                  {child.children ? (
                    <MenuItemWithChildren
                      item={child}
                      linkClassName={clsx('nav-link', getActiveClass(child))}
                      activeMenuItems={activeMenuItems}
                      className="sub-nav-item"
                      subMenuClassName="nav sub-navbar-nav"
                      toggleMenu={toggleMenu}
                      matchingMenuItem={matchingMenuItem}
                      menuItems={menuItems}
                      pathname={pathname}
                    />
                  ) : (
                    <MenuItem item={child} className="sub-nav-item" linkClassName={clsx('sub-nav-link', getActiveClass(child))} />
                  )}
                </Fragment>
              )
            })}
          </ul>
        </div>
      </Collapse>
    </li>
  )
}

const MenuItem = ({ item, className, linkClassName }) => {
  return (
    <li className={className}>
      <MenuItemLink item={item} className={linkClassName} />
    </li>
  )
}

const MenuItemLink = ({ item, className }) => {
  return (
    <Link
      to={item.url ?? ''}
      target={item.target}
      className={clsx(className, {
        disabled: item.isDisabled,
      })}>
      {item.icon && (
        <span className="nav-icon">
          <IconifyIcon icon={item.icon} />
        </span>
      )}
      <span className="nav-text">{item.label}</span>
      {item.badge && <span className={`badge badge-pill text-end bg-${item.badge.variant}`}>{item.badge.text}</span>}
    </Link>
  )
}

const AppMenu = ({ menuItems }) => {
  const { pathname } = useLocation()
  const [activeMenuItems, setActiveMenuItems] = useState([])

  const matchingMenuItem = useMemo(() => {
    if (!menuItems?.length) return null
    return getMenuItemFromURL(menuItems, pathname ?? '') || null
  }, [menuItems, pathname])

  const toggleMenu = useCallback(
    (menuItem, show) => {
      if (!show) return
      const routeKeys = getActiveKeysForPathname(menuItems, pathname ?? '', matchingMenuItem)
      const expandKeys = [menuItem.key, ...findAllParent(menuItems, menuItem)]
      setActiveMenuItems([...new Set([...routeKeys, ...expandKeys])])
    },
    [pathname, menuItems, matchingMenuItem],
  )

  const getActiveClass = useCallback(
    (item) => {
      return activeMenuItems?.includes(item.key) ? 'active' : ''
    },
    [activeMenuItems],
  )

  const activeMenu = useCallback(() => {
    const url = pathname ?? ''
    setActiveMenuItems(getActiveKeysForPathname(menuItems, url, matchingMenuItem))
    if (matchingMenuItem && url) {
      setTimeout(() => {
        const activatedItem = document.querySelector(`#leftside-menu-container .simplebar-content a[href="${url}"]`)
        if (activatedItem) {
          const simplebarContent = document.querySelector('#leftside-menu-container .simplebar-content-wrapper')
          if (simplebarContent) {
            const offset = activatedItem.offsetTop - window.innerHeight * 0.4
            scrollTo(simplebarContent, offset, 600)
          }
        }
      }, 400)

      // scrollTo (Left Side Bar Active Menu)
      const easeInOutQuad = (t, b, c, d) => {
        t /= d / 2
        if (t < 1) return (c / 2) * t * t + b
        t--
        return (-c / 2) * (t * (t - 2) - 1) + b
      }
      const scrollTo = (element, to, duration) => {
        const start = element.scrollTop,
          change = to - start,
          increment = 20
        let currentTime = 0
        const animateScroll = function () {
          currentTime += increment
          const val = easeInOutQuad(currentTime, start, change, duration)
          element.scrollTop = val
          if (currentTime < duration) {
            setTimeout(animateScroll, increment)
          }
        }
        animateScroll()
      }
    }
  }, [pathname, menuItems, matchingMenuItem])

  useEffect(() => {
    if (menuItems && menuItems.length > 0) activeMenu()
  }, [activeMenu, menuItems])

  return (
    <ul className="navbar-nav">
      {(menuItems || []).map((item, idx) => {
        return (
          <Fragment key={item.key + idx}>
            {item.isTitle ? (
              <li className="menu-title">{item.label}</li>
            ) : (
              <>
                {item.children ? (
                  <MenuItemWithChildren
                    item={item}
                    toggleMenu={toggleMenu}
                    className="nav-item"
                    linkClassName={clsx('nav-link', getActiveClass(item))}
                    subMenuClassName="nav sub-navbar-nav"
                    activeMenuItems={activeMenuItems}
                    matchingMenuItem={matchingMenuItem}
                    menuItems={menuItems}
                    pathname={pathname}
                  />
                ) : (
                  <MenuItem item={item} linkClassName={clsx('nav-link', getActiveClass(item))} className="nav-item" />
                )}
              </>
            )}
          </Fragment>
        )
      })}
    </ul>
  )
}
export default AppMenu
