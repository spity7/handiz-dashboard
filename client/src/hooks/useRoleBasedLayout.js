import { useEffect } from 'react'
import { ROLES } from '@/constants/roles'
import { useAuthContext } from '@/context/useAuthContext'
import { useLayoutContext } from '@/context/useLayoutContext'
import useViewPort from '@/hooks/useViewPort'

const DESKTOP_BREAKPOINT = 1140

export default function useRoleBasedLayout() {
  const { user } = useAuthContext()
  const {
    menu: { size },
    changeMenu: { size: changeMenuSize },
  } = useLayoutContext()
  const { width } = useViewPort()

  const isUserRole = user?.role === ROLES.USER
  const isDesktop = width > DESKTOP_BREAKPOINT

  useEffect(() => {
    if (!user) return

    if (isUserRole) {
      if (size !== 'hidden') changeMenuSize('hidden')
      return
    }

    const targetSize = isDesktop ? 'default' : 'hidden'
    if (size !== targetSize) changeMenuSize(targetSize)
  }, [user, isUserRole, isDesktop, size, changeMenuSize])

  return {
    isUserRole,
    showSidebar: !isUserRole,
  }
}
