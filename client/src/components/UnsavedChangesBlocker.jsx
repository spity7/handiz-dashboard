import { useContext, useEffect, useRef } from 'react'
import { UNSAFE_NavigationContext as NavigationContext, useLocation, useNavigate } from 'react-router-dom'
import { useUnsavedFormChanges } from '@/context/UnsavedFormChangesContext'

const normalizePath = (path) => {
  if (!path) return ''
  const withoutQuery = path.split('?')[0].split('#')[0]
  if (!withoutQuery) return ''
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`
}

const getHrefPath = (href) => {
  if (!href) return ''
  if (href.startsWith('http://') || href.startsWith('https://')) {
    try {
      const url = new URL(href)
      if (url.origin !== window.location.origin) return null
      return normalizePath(url.pathname)
    } catch {
      return null
    }
  }
  return normalizePath(href)
}

const UnsavedChangesBlocker = () => {
  const { hasUnsavedChanges, getHasUnsavedChanges, confirmDiscardUnsavedChanges, resetDiscardConfirmed } = useUnsavedFormChanges()
  const { navigator } = useContext(NavigationContext)
  const location = useLocation()
  const navigate = useNavigate()

  const getHasUnsavedRef = useRef(getHasUnsavedChanges)
  const confirmRef = useRef(confirmDiscardUnsavedChanges)
  const locationPathRef = useRef(location.pathname)
  const navigateRef = useRef(navigate)

  getHasUnsavedRef.current = getHasUnsavedChanges
  confirmRef.current = confirmDiscardUnsavedChanges
  locationPathRef.current = location.pathname
  navigateRef.current = navigate

  useEffect(() => {
    resetDiscardConfirmed()
  }, [location.pathname, resetDiscardConfirmed])

  useEffect(() => {
    if (!navigator?.push || !navigator?.replace) return

    const originalPush = navigator.push
    const originalReplace = navigator.replace

    const shouldBlock = (to) => {
      if (!getHasUnsavedRef.current()) return false
      const nextPath = normalizePath(typeof to === 'string' ? to : to?.pathname)
      const currentPath = normalizePath(locationPathRef.current)
      if (!nextPath || nextPath === currentPath) return false
      return true
    }

    const runNavigation = (originalFn, args) => {
      if (!shouldBlock(args[0])) {
        originalFn(...args)
        return
      }

      confirmRef.current().then((canProceed) => {
        if (canProceed) {
          originalFn(...args)
        }
      })
    }

    navigator.push = (...args) => runNavigation(originalPush, args)
    navigator.replace = (...args) => runNavigation(originalReplace, args)

    return () => {
      navigator.push = originalPush
      navigator.replace = originalReplace
    }
  }, [navigator])

  useEffect(() => {
    const onClickCapture = (event) => {
      if (!getHasUnsavedRef.current()) return

      const anchor = event.target.closest('a[href]')
      if (!anchor) return
      if (anchor.getAttribute('target') === '_blank') return
      if (anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return

      const nextPath = getHrefPath(href)
      if (!nextPath) return

      const currentPath = normalizePath(locationPathRef.current)
      if (nextPath === currentPath) return

      event.preventDefault()
      event.stopPropagation()

      confirmRef.current().then((canProceed) => {
        if (!canProceed) return
        const search = href.includes('?') ? href.slice(href.indexOf('?')) : ''
        const hash = href.includes('#') ? href.slice(href.indexOf('#')) : ''
        navigateRef.current(`${nextPath}${search}${hash}`)
      })
    }

    document.addEventListener('click', onClickCapture, true)
    return () => document.removeEventListener('click', onClickCapture, true)
  }, [])

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined

    const onBeforeUnload = (event) => {
      if (!getHasUnsavedChanges()) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [hasUnsavedChanges, getHasUnsavedChanges])

  return null
}

export default UnsavedChangesBlocker
