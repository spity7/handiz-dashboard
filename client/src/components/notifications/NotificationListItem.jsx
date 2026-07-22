import clsx from 'clsx'
import { DropdownItem } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { timeSince } from '@/utils/date'
import { navigateToNotificationLink } from '@/utils/notificationLinks'

const NOTIFICATION_META = {
  project_pending: {
    icon: 'bx:time-five',
    iconClass: 'notification-item-icon--pending',
  },
  project_published: {
    icon: 'bx:check-circle',
    iconClass: 'notification-item-icon--published',
  },
  project_unpublished: {
    icon: 'bx:x-circle',
    iconClass: 'notification-item-icon--unpublished',
  },
}

export const getNotificationMeta = (type) => NOTIFICATION_META[type] || { icon: 'bx:bell', iconClass: 'notification-item-icon--default' }

const NotificationListItemContent = ({ notification, meta, isUnread }) => (
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
)

const itemClassName = (isUnread) =>
  clsx('notification-item py-3 px-3 text-start border-0 rounded-0 w-100', isUnread ? 'notification-item--unread' : 'notification-item--read')

const NotificationListItem = ({ notification, onRead, variant = 'dropdown', onNavigate }) => {
  const isUnread = !notification.isRead
  const meta = getNotificationMeta(notification.type)

  const handleClick = async () => {
    if (isUnread && onRead) {
      await onRead(notification._id)
    }
    if (notification.link) {
      navigateToNotificationLink(notification.link, onNavigate)
    }
  }

  if (variant === 'list') {
    return (
      <button type="button" className={itemClassName(isUnread)} onClick={handleClick}>
        <NotificationListItemContent notification={notification} meta={meta} isUnread={isUnread} />
      </button>
    )
  }

  return (
    <DropdownItem as="button" type="button" className={itemClassName(isUnread)} onClick={handleClick}>
      <NotificationListItemContent notification={notification} meta={meta} isUnread={isUnread} />
    </DropdownItem>
  )
}

export default NotificationListItem
