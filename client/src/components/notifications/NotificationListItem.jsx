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
  course_enrolled: {
    icon: 'bx:book-reader',
    iconClass: 'notification-item-icon--info',
  },
  course_completed: {
    icon: 'bx:trophy',
    iconClass: 'notification-item-icon--published',
  },
  course_new_lesson: {
    icon: 'bx:video',
    iconClass: 'notification-item-icon--info',
  },
  lesson_device_conflict: {
    icon: 'bx:laptop',
    iconClass: 'notification-item-icon--pending',
  },
}

const getCourseInstructorMeta = (notification) => {
  const message = notification?.message || ''

  if (message.includes('still in draft')) {
    return {
      icon: 'bx:edit',
      iconClass: 'notification-item-icon--pending',
    }
  }

  if (message.includes('archived')) {
    return {
      icon: 'bx:archive',
      iconClass: 'notification-item-icon--unpublished',
    }
  }

  return {
    icon: 'bx:chalkboard',
    iconClass: 'notification-item-icon--published',
  }
}

export const getNotificationMeta = (notification) => {
  if (typeof notification === 'string') {
    return NOTIFICATION_META[notification] || { icon: 'bx:bell', iconClass: 'notification-item-icon--default' }
  }

  if (notification?.type === 'course_instructor_assigned') {
    return getCourseInstructorMeta(notification)
  }

  return NOTIFICATION_META[notification?.type] || { icon: 'bx:bell', iconClass: 'notification-item-icon--default' }
}

const NotificationListItemContent = ({ notification, meta, isUnread }) => {
  const hasLink = Boolean(notification.link)

  return (
    <div className="notification-item__layout">
      <span className={clsx('notification-item-icon', meta.iconClass)}>
        <IconifyIcon icon={meta.icon} className="fs-18" />
      </span>
      <div className="notification-item__content">
        <div className="notification-item__title-row">
          <p className="notification-item-title mb-0">{notification.title}</p>
          {isUnread && <span className="notification-item__badge">New</span>}
        </div>
        {notification.createdAt && <time className="notification-item-time">{timeSince(notification.createdAt)}</time>}
        <p className="notification-item-message mb-0">{notification.message}</p>
        {hasLink && (
          <span className="notification-item__chevron" aria-hidden="true">
            <IconifyIcon icon="lucide:chevron-right" className="notification-item__chevron-icon" style={{ strokeWidth: 2.5 }} />
          </span>
        )}
      </div>
    </div>
  )
}

const itemClassName = (isUnread, hasLink) =>
  clsx(
    'notification-item text-start border-0 rounded-0 w-100',
    isUnread ? 'notification-item--unread' : 'notification-item--read',
    hasLink && 'notification-item--interactive',
  )

const NotificationListItem = ({ notification, onRead, variant = 'dropdown', onNavigate }) => {
  const isUnread = !notification.isRead
  const hasLink = Boolean(notification.link)
  const meta = getNotificationMeta(notification)

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
      <button type="button" className={itemClassName(isUnread, hasLink)} onClick={handleClick}>
        <NotificationListItemContent notification={notification} meta={meta} isUnread={isUnread} />
      </button>
    )
  }

  return (
    <DropdownItem as="button" type="button" className={itemClassName(isUnread, hasLink)} onClick={handleClick}>
      <NotificationListItemContent notification={notification} meta={meta} isUnread={isUnread} />
    </DropdownItem>
  )
}

export default NotificationListItem
