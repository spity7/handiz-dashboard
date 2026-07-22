import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, Dropdown, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient'
import NotificationListItem from '@/components/notifications/NotificationListItem'
import useNotifications from '@/hooks/useNotifications'

const Notifications = () => {
  const navigate = useNavigate()
  const { notifications, unreadCount, loadError, load, handleMarkRead, handleClearAll } = useNotifications({ limit: 10 })

  return (
    <Dropdown className="topbar-item" align="end" onToggle={(open) => open && load(true)}>
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
        <div className="dropdown-notifications-header">
          <div className="dropdown-notifications-header__main">
            <span className="dropdown-notifications-header__icon" aria-hidden="true">
              <IconifyIcon icon="bx:bell" />
            </span>
            <div className="min-w-0">
              <h6 className="dropdown-notifications-header__title">Notifications</h6>
              {unreadCount > 0 ? (
                <p className="dropdown-notifications-header__subtitle mb-0">
                  <Badge bg="primary" pill className="me-1">
                    {unreadCount}
                  </Badge>
                  unread {unreadCount === 1 ? 'notification' : 'notifications'}
                </p>
              ) : (
                <p className="dropdown-notifications-header__subtitle mb-0">You&apos;re all caught up</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              className="dropdown-notifications-header__action"
              onClick={handleClearAll}
              aria-label="Mark all notifications as read">
              <IconifyIcon icon="lucide:check-check" className="dropdown-notifications-header__action-icon" aria-hidden="true" />
              Mark all read
            </button>
          )}
        </div>

        <SimplebarReactClient className="dropdown-notifications-body">
          {loadError ? (
            <div className="dropdown-notifications-state dropdown-notifications-state--error">
              <IconifyIcon icon="bx:error-circle" className="dropdown-notifications-state__icon" />
              <p className="mb-2 small">{loadError}</p>
              <Button size="sm" variant="outline-danger" onClick={() => load(true)}>
                Retry
              </Button>
            </div>
          ) : notifications.length ? (
            <div className="dropdown-notifications-list">
              {notifications.map((notification) => (
                <NotificationListItem key={notification._id} notification={notification} onRead={handleMarkRead} onNavigate={navigate} />
              ))}
            </div>
          ) : (
            <div className="dropdown-notifications-state">
              <IconifyIcon icon="bx:bell-off" className="dropdown-notifications-state__icon" />
              <p className="mb-0 small">No notifications yet</p>
            </div>
          )}
        </SimplebarReactClient>

        <div className="dropdown-notifications-footer">
          <Link to="/pages/notifications" className="dropdown-notifications-footer__link">
            View all notifications
            <IconifyIcon icon="bx:chevron-right" />
          </Link>
        </div>
      </DropdownMenu>
    </Dropdown>
  )
}

export default Notifications
