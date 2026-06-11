import { useEffect, useState, useCallback } from 'react'
import clsx from 'clsx'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient'
import { useGlobalContext } from '@/context/useGlobalContext'
import { timeSince } from '@/utils/date'

const NOTIFICATION_META = {
  project_pending: {
    icon: 'bx:time-five',
    iconClass: 'notification-item-icon--pending',
  },
  user_action_request: {
    icon: 'bx:user-voice',
    iconClass: 'notification-item-icon--request',
  },
  user_action_decided: {
    icon: 'bx:check-circle',
    iconClass: 'notification-item-icon--decided',
  },
}

const getNotificationMeta = (type) => NOTIFICATION_META[type] || { icon: 'bx:bell', iconClass: 'notification-item-icon--default' }

const NotificationItem = ({ notification, onRead }) => {
  const navigate = useNavigate()
  const isUnread = !notification.isRead
  const meta = getNotificationMeta(notification.type)

  const handleClick = async () => {
    if (isUnread) {
      await onRead(notification._id)
    }
    if (notification.link) {
      const link = notification.link.startsWith('/pages/user-requests') ? '/pages/users' : notification.link
      navigate(link)
    }
  }

  return (
    <DropdownItem
      as="button"
      type="button"
      className={clsx(
        'notification-item py-3 px-3 text-start border-0 rounded-0',
        isUnread ? 'notification-item--unread' : 'notification-item--read',
      )}
      onClick={handleClick}>
      <div className="d-flex align-items-start gap-3">
        <span className={clsx('notification-item-icon', meta.iconClass)}>
          <IconifyIcon icon={meta.icon} className="fs-20" />
        </span>
        <div className="flex-grow-1 min-w-0">
          <div className="d-flex align-items-start justify-content-between gap-2">
            <p className="notification-item-title mb-1 fw-semibold lh-sm">{notification.title}</p>
            {isUnread && <span className="notification-unread-dot" aria-hidden="true" />}
          </div>
          <p className="mb-1 text-wrap text-muted small lh-base">{notification.message}</p>
          {notification.createdAt && (
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
              {timeSince(notification.createdAt)}
            </span>
          )}
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
    if (!unreadCount) return
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
      <DropdownMenu className="py-0 dropdown-notifications">
        <div className="dropdown-notifications-header p-3 border-bottom border-dashed">
          <Row className="align-items-center g-2">
            <Col>
              <h6 className="m-0 fs-16 fw-semibold">Notifications</h6>
              {unreadCount > 0 ? (
                <p className="mb-0 mt-1 text-muted small">
                  You have{' '}
                  <Badge bg="primary" pill>
                    {unreadCount}
                  </Badge>{' '}
                  unread {unreadCount === 1 ? 'notification' : 'notifications'}
                </p>
              ) : (
                <p className="mb-0 mt-1 text-muted small">You&apos;re all caught up</p>
              )}
            </Col>
            <Col xs="auto">
              <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={handleClearAll} disabled={!unreadCount}>
                Mark all read
              </button>
            </Col>
          </Row>
        </div>
        <SimplebarReactClient style={{ maxHeight: 360 }}>
          {notifications.length ? (
            notifications.map((n) => <NotificationItem key={n._id} notification={n} onRead={handleMarkRead} />)
          ) : (
            <div className="text-center text-muted py-5 px-3">
              <IconifyIcon icon="bx:bell-off" className="fs-32 mb-2 d-block mx-auto opacity-50" />
              <p className="mb-0 small">No notifications yet</p>
            </div>
          )}
        </SimplebarReactClient>
        <div className="dropdown-notifications-footer text-center py-3 px-3">
          <Link to="/ecommerce/student-projects" className="d-block">
            <Button size="sm" variant="soft-primary" className="icons-center w-100">
              View student projects
              <IconifyIcon icon="bx:right-arrow-alt" className="ms-2" />
            </Button>
          </Link>
        </div>
      </DropdownMenu>
    </Dropdown>
  )
}
export default Notifications
