import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { useGlobalContext } from '@/context/useGlobalContext'
import useRefetchOnFocus from '@/hooks/useRefetchOnFocus'

const LOAD_ERROR_MESSAGE = 'Failed to load notifications. Please try again.'

export default function useNotifications({ limit = 10, poll = true } = {}) {
  const { getNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead } = useGlobalContext()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadError, setLoadError] = useState(null)

  const load = useCallback(
    async (showErrorToast = false) => {
      try {
        const [listData, count] = await Promise.all([getNotifications({ limit }), getUnreadNotificationCount()])
        setNotifications(listData.notifications || [])
        setUnreadCount(count || 0)
        setLoadError(null)
        return listData
      } catch {
        setLoadError(LOAD_ERROR_MESSAGE)
        if (showErrorToast) {
          toast.error(LOAD_ERROR_MESSAGE)
        }
        return null
      }
    },
    [getNotifications, getUnreadNotificationCount, limit],
  )

  useEffect(() => {
    load(true)
    if (!poll) return undefined
    const interval = setInterval(() => load(false), 60000)
    return () => clearInterval(interval)
  }, [load, poll])

  useRefetchOnFocus(() => load(false))

  const handleMarkRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))

    try {
      await markNotificationRead(id)
    } catch {
      toast.error('Failed to mark notification as read.')
      load(true)
    }
  }

  const handleClearAll = async () => {
    if (!unreadCount) return

    const previousNotifications = notifications
    const previousCount = unreadCount
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)

    try {
      await markAllNotificationsRead()
    } catch {
      toast.error('Failed to mark all notifications as read.')
      setNotifications(previousNotifications)
      setUnreadCount(previousCount)
    }
  }

  return {
    notifications,
    unreadCount,
    loadError,
    load,
    handleMarkRead,
    handleClearAll,
  }
}
