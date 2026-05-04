import { MENU_ITEMS } from '@/assets/data/menu-items'

export const getMenuItems = () => {
  return MENU_ITEMS
}

export const findAllParent = (menuItems, menuItem) => {
  let parents = []
  const parent = findMenuItem(menuItems, menuItem.parentKey)
  if (parent) {
    parents.push(parent.key)
    if (parent.parentKey) {
      parents = [...parents, ...findAllParent(menuItems, parent)]
    }
  }
  return parents
}
export const getMenuItemFromURL = (items, url) => {
  if (items instanceof Array) {
    for (const item of items) {
      const foundItem = getMenuItemFromURL(item, url)
      if (foundItem) {
        return foundItem
      }
    }
  } else if (items) {
    if (items.url == url) return items
    if (items.children != null) {
      for (const item of items.children) {
        const foundItem = getMenuItemFromURL(item, url)
        if (foundItem) return foundItem
      }
    }
  }
  return null
}
export const findMenuItem = (menuItems, menuItemKey) => {
  if (menuItems && menuItemKey) {
    for (const item of menuItems) {
      if (item.key === menuItemKey) {
        return item
      }
      const found = findMenuItem(item.children, menuItemKey)
      if (found) return found
    }
  }
  return null
}

/** True when descendantKey refers to a menu row that is under ancestorKey, but is not ancestorKey itself. */
export const isStrictDescendantKey = (menuItems, descendantKey, ancestorKey) => {
  if (!menuItems || !descendantKey || !ancestorKey || descendantKey === ancestorKey) return false
  let current = findMenuItem(menuItems, descendantKey)
  while (current?.parentKey) {
    if (current.parentKey === ancestorKey) return true
    current = findMenuItem(menuItems, current.parentKey)
  }
  return false
}

/**
 * When true on a menu row, routes under item.url (e.g. /section/create) do not auto-expand
 * that row’s submenu—only strict sidebar descendant matches expand it.
 */
const expandsOnDeepRoute = (item, pathname) => {
  if (item.suppressDeepRouteExpand || !item.url || !item.children?.length) return false
  const base = String(item.url).replace(/\/$/, '')
  const p = pathname ?? ''
  return Boolean(p && p !== base && p.startsWith(`${base}/`))
}

/**
 * Expand submenu if a strict menu descendant matches, or pathname continues under item.url
 * (off-menu nested routes) unless suppressDeepRouteExpand is set, or any direct child is active.
 */
export const itemSubmenuShouldOpen = (item, pathname, matchingMenuItem, menuItems, activeMenuItems = []) => {
  if (!item.children?.length) return false
  if (matchingMenuItem && isStrictDescendantKey(menuItems, matchingMenuItem.key, item.key)) return true
  if (expandsOnDeepRoute(item, pathname)) return true
  if (activeMenuItems.length && item.children.some((ch) => activeMenuItems.includes(ch.key))) return true
  return item.children.some((ch) => itemSubmenuShouldOpen(ch, pathname, matchingMenuItem, menuItems, activeMenuItems))
}

/** Active menu keys from exact URL match + off-menu nested routes (e.g. /student-projects/edit/...). */
export const getActiveKeysForPathname = (menuItems, pathname, matchingMenuItem) => {
  const url = pathname ?? ''
  let nextActive = []
  if (matchingMenuItem) {
    const activeMt = findMenuItem(menuItems, matchingMenuItem.key)
    if (activeMt) {
      nextActive = [activeMt.key, ...findAllParent(menuItems, activeMt)]
    }
  }
  return mergeActiveKeysForPathname(menuItems, url, nextActive)
}

/** Add active keys for menu parents whose url matches a strict prefix of pathname (off-menu nested routes). */
export const mergeActiveKeysForPathname = (menuItems, pathname, initialKeys = []) => {
  const keys = new Set(initialKeys)
  const walk = (items) => {
    if (!items) return
    const list = Array.isArray(items) ? items : [items]
    for (const it of list) {
      if (it.url && it.children?.length) {
        const base = String(it.url).replace(/\/$/, '')
        const p = pathname ?? ''
        if (p && p !== base && p.startsWith(`${base}/`)) {
          keys.add(it.key)
          findAllParent(menuItems, it).forEach((k) => keys.add(k))
        }
      }
      if (it.children) walk(it.children)
    }
  }
  walk(menuItems)
  return [...keys]
}
