export const ROLES = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  USER: 'User',
}

export const PROJECT_STATUS = {
  PENDING: 'Pending',
  PUBLISHED: 'Published',
  UNPUBLISHED: 'Unpublished',
}

const sameId = (a, b) => String(a) === String(b)

export const isOwner = (user, project) => user && project?.createdBy && sameId(user._id, project.createdBy?._id ?? project.createdBy)

export const isUserCreatedProject = (project) => project?.createdByRole === ROLES.USER

export const canReadProject = (user, project) => {
  if (!user || !project) return false
  if (user.role === ROLES.ADMIN || user.role === ROLES.EDITOR) return true
  if (isOwner(user, project)) return true
  return false
}

export const canWriteProject = (user, project) => {
  if (!user || !project) return false
  if (user.role === ROLES.ADMIN || user.role === ROLES.EDITOR) return true
  if (isOwner(user, project)) return true
  return false
}

export const canPublishProject = (user, project) => {
  if (!user || !project) return false
  if (user.role === ROLES.USER) return false
  if (user.role === ROLES.ADMIN || user.role === ROLES.EDITOR) return true
  return false
}

export const canManageCms = (user) => user?.role === ROLES.ADMIN

export const canViewUsers = (user) => user?.role === ROLES.ADMIN || user?.role === ROLES.EDITOR

export const canManageUsersDirect = (user) => user?.role === ROLES.ADMIN

export const canManageTaxonomy = (user) => user?.role === ROLES.ADMIN || user?.role === ROLES.EDITOR

export const statusBadgeVariant = (status) => {
  switch (status) {
    case PROJECT_STATUS.PUBLISHED:
      return 'success'
    case PROJECT_STATUS.PENDING:
      return 'warning'
    case PROJECT_STATUS.UNPUBLISHED:
      return 'secondary'
    default:
      return 'light'
  }
}
