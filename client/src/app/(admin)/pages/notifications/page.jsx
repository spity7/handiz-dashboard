import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Alert, Badge, Button, Card, CardBody, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import NotificationListItem from '@/components/notifications/NotificationListItem'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import useRefetchOnFocus from '@/hooks/useRefetchOnFocus'

const PAGE_SIZE = 20
const LOAD_ERROR_MESSAGE = 'Failed to load notifications. Please try again.'

const NotificationsPage = () => {
  const navigate = useNavigate()
  const { getNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead } = useGlobalContext()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const loadPage = useCallback(
    async (pageToLoad, { append = false, showErrorToast = false } = {}) => {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      try {
        const [listData, count] = await Promise.all([getNotifications({ page: pageToLoad, limit: PAGE_SIZE }), getUnreadNotificationCount()])

        setNotifications((prev) => (append ? [...prev, ...(listData.notifications || [])] : listData.notifications || []))
        setTotal(listData.total || 0)
        setUnreadCount(count || 0)
        setPage(pageToLoad)
        setLoadError(null)
      } catch {
        setLoadError(LOAD_ERROR_MESSAGE)
        if (showErrorToast) {
          toast.error(LOAD_ERROR_MESSAGE)
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [getNotifications, getUnreadNotificationCount],
  )

  useEffect(() => {
    loadPage(1, { showErrorToast: true })
  }, [loadPage])

  useRefetchOnFocus(() => loadPage(1))

  const handleMarkRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))

    try {
      await markNotificationRead(id)
    } catch {
      toast.error('Failed to mark notification as read.')
      loadPage(1, { showErrorToast: true })
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

  const hasMore = notifications.length < total

  return (
    <>
      <PageMetaData title="Notifications" />
      <PageBreadcrumb title="Notifications" subName="Pages" />

      <Row>
        <Col>
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                <div>
                  <h5 className="mb-1">All notifications</h5>
                  {unreadCount > 0 ? (
                    <p className="mb-0 text-muted small">
                      You have{' '}
                      <Badge bg="primary" pill>
                        {unreadCount}
                      </Badge>{' '}
                      unread {unreadCount === 1 ? 'notification' : 'notifications'}
                    </p>
                  ) : (
                    <p className="mb-0 text-muted small">You&apos;re all caught up</p>
                  )}
                </div>
                <Button variant="soft-primary" size="sm" className="icons-center" onClick={handleClearAll} disabled={!unreadCount}>
                  <IconifyIcon icon="lucide:check-check" className="me-1" />
                  Mark all read
                </Button>
              </div>

              {loadError && !loading && (
                <Alert variant="danger" className="d-flex align-items-center justify-content-between gap-3">
                  <span className="mb-0 small">{loadError}</span>
                  <Button size="sm" variant="outline-danger" onClick={() => loadPage(1, { showErrorToast: true })}>
                    Retry
                  </Button>
                </Alert>
              )}

              {loading ? (
                <div className="text-center text-muted py-5">
                  <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Loading notifications...
                </div>
              ) : notifications.length ? (
                <div className="notification-list border rounded overflow-hidden">
                  {notifications.map((notification) => (
                    <NotificationListItem
                      key={notification._id}
                      notification={notification}
                      variant="list"
                      onRead={handleMarkRead}
                      onNavigate={navigate}
                    />
                  ))}
                </div>
              ) : !loadError ? (
                <div className="text-center text-muted py-5">
                  <IconifyIcon icon="bx:bell-off" className="fs-32 mb-2 d-block mx-auto opacity-50" />
                  <p className="mb-0 small">No notifications yet</p>
                </div>
              ) : null}

              {hasMore && !loading && (
                <div className="text-center mt-4">
                  <Button variant="outline-primary" size="sm" disabled={loadingMore} onClick={() => loadPage(page + 1, { append: true })}>
                    {loadingMore ? 'Loading...' : 'Load more'}
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default NotificationsPage
