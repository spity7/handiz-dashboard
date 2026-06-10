import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient'
import { useGlobalContext } from '@/context/useGlobalContext'

const NotificationItem = ({ notification, onRead }) => {
  const navigate = useNavigate()
  const handleClick = async () => {
    if (!notification.isRead) {
      await onRead(notification._id)
    }
    if (notification.link) {
      navigate(notification.link)
    }
  }

  return (
    <DropdownItem className="py-3 border-bottom text-wrap" onClick={handleClick}>
      <div className="d-flex">
        <div className="flex-shrink-0">
          <div className="avatar-sm me-2">
            <span className="avatar-title bg-soft-info text-info fs-20 rounded-circle">!</span>
          </div>
        </div>
        <div className="flex-grow-1">
          <p className="mb-0 fw-semibold">{notification.title}</p>
          <p className="mb-0 text-wrap text-muted small">{notification.message}</p>
        </div>
      </div>
    </DropdownItem>
  )
}

const Notifications = () => {
  const { getNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead } = useGlobalContext()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const load = useCallback(async () => {
    try {
      const [listData, count] = await Promise.all([getNotifications({ limit: 10 }), getUnreadNotificationCount()])
      setNotifications(listData.notifications || [])
      setUnreadCount(count || 0)
    } catch {
      // silent
    }
  }, [getNotifications, getUnreadNotificationCount])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [load])

  const handleMarkRead = async (id) => {
    await markNotificationRead(id)
    load()
  }

  const handleClearAll = async () => {
    await markAllNotificationsRead()
    load()
  }

  return (
    <Dropdown className="topbar-item" align="end" onToggle={(open) => open && load()}>
      <DropdownToggle as="button" className="content-none topbar-button position-relative" aria-haspopup="true">
        <IconifyIcon icon="iconamoon:notification-duotone" className="fs-24 align-middle" />
        {unreadCount > 0 && (
          <span className="position-absolute topbar-badge fs-10 translate-middle badge bg-danger rounded-pill">
            {unreadCount > 9 ? '9+' : unreadCount}
            <span className="visually-hidden">unread notifications</span>
          </span>
        )}
      </DropdownToggle>
      <DropdownMenu className="py-0 dropdown-lg">
        <div className="p-3 border-top-0 border-start-0 border-end-0 border-dashed border">
          <Row className="align-items-center">
            <Col>
              <h6 className="m-0 fs-16 fw-semibold">Notifications</h6>
            </Col>
            <Col xs="auto">
              <button type="button" className="btn btn-link btn-sm p-0 text-dark text-decoration-underline" onClick={handleClearAll}>
                Clear all
              </button>
            </Col>
          </Row>
        </div>
        <SimplebarReactClient style={{ maxHeight: 280 }}>
          {notifications.length ? (
            notifications.map((n) => <NotificationItem key={n._id} notification={n} onRead={handleMarkRead} />)
          ) : (
            <div className="text-center text-muted py-4 small">No notifications</div>
          )}
        </SimplebarReactClient>
        <div className="text-center py-3">
          <Link to="/ecommerce/student-projects">
            <Button size="sm" variant="primary" className="icons-center">
              View projects
              <IconifyIcon icon="bx:right-arrow-alt" className="ms-2" />
            </Button>
          </Link>
        </div>
      </DropdownMenu>
    </Dropdown>
  )
}
export default Notifications
