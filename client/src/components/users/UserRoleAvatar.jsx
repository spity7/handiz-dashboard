import clsx from 'clsx'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { ROLES } from '@/constants/roles'

const ROLE_AVATAR_CONFIG = {
  [ROLES.ADMIN]: {
    className: 'user-role-avatar--admin',
    icon: 'bx:shield-quarter',
  },
  [ROLES.EDITOR]: {
    className: 'user-role-avatar--editor',
    icon: 'bx:edit-alt',
  },
  [ROLES.USER]: {
    className: 'user-role-avatar--user',
    icon: 'bx:user',
  },
}

const getInitials = (firstname = '', lastname = '') => `${firstname.charAt(0)}${lastname.charAt(0)}`.toUpperCase() || '?'

const UserRoleAvatar = ({ user, size = 'md', className, showRoleIcon = true }) => {
  if (!user) return null

  const role = user.role || ROLES.USER
  const config = ROLE_AVATAR_CONFIG[role] || ROLE_AVATAR_CONFIG[ROLES.USER]
  const deleted = Boolean(user.deletedAt)

  return (
    <span
      className={clsx('user-role-avatar', `user-role-avatar--${size}`, config.className, deleted && 'user-role-avatar--deleted', className)}
      title={role}
      aria-hidden="true">
      <span className="user-role-avatar__initials">{getInitials(user.firstname, user.lastname)}</span>
      {showRoleIcon && (
        <span className="user-role-avatar__role-icon">
          <IconifyIcon icon={config.icon} />
        </span>
      )}
    </span>
  )
}

export default UserRoleAvatar
