import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, Col, Dropdown, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap'
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
          {loadError ? (
            <div className="text-center text-danger py-4 px-3">
              <p className="mb-2 small">{loadError}</p>
              <Button size="sm" variant="outline-danger" onClick={() => load(true)}>
                Retry
              </Button>
            </div>
          ) : notifications.length ? (
            notifications.map((n) => <NotificationListItem key={n._id} notification={n} onRead={handleMarkRead} onNavigate={navigate} />)
          ) : (
            <div className="text-center text-muted py-5 px-3">
              <IconifyIcon icon="bx:bell-off" className="fs-32 mb-2 d-block mx-auto opacity-50" />
              <p className="mb-0 small">No notifications yet</p>
            </div>
          )}
        </SimplebarReactClient>
        <div className="dropdown-notifications-footer text-center py-3 px-3 d-grid gap-2">
          <Link to="/pages/notifications" className="d-block">
            <Button size="sm" variant="soft-secondary" className="icons-center w-100">
              View all notifications
              <IconifyIcon icon="bx:right-arrow-alt" className="ms-2" />
            </Button>
          </Link>
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
