const ROLES = {
  ADMIN: "Admin",
  EDITOR: "Editor",
  USER: "User",
};

const PERMISSIONS = {
  "studentProjects:read": [ROLES.ADMIN, ROLES.EDITOR, ROLES.USER],
  "studentProjects:create": [ROLES.ADMIN, ROLES.EDITOR, ROLES.USER],
  "studentProjects:taxonomy": [ROLES.ADMIN, ROLES.EDITOR],
  "cms:manage": [ROLES.ADMIN],
  "users:read": [ROLES.ADMIN, ROLES.EDITOR],
  "users:manage": [ROLES.ADMIN],
  "userRequests:submit": [ROLES.EDITOR],
  "userRequests:review": [ROLES.ADMIN],
};

const hasPermission = (role, permission) =>
  PERMISSIONS[permission]?.includes(role) ?? false;

module.exports = { ROLES, PERMISSIONS, hasPermission };
