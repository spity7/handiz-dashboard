const ROLES = {
  ADMIN: "Admin",
  EDITOR: "Editor",
  USER: "User",
};

const PERMISSIONS = {
  "studentProjects:read": [ROLES.ADMIN, ROLES.EDITOR, ROLES.USER],
  "studentProjects:create": [ROLES.ADMIN, ROLES.EDITOR, ROLES.USER],
  "studentProjects:taxonomy": [ROLES.ADMIN, ROLES.EDITOR],
  "courses:read": [ROLES.ADMIN, ROLES.EDITOR],
  "courses:manage": [ROLES.ADMIN],
  "courses:enroll": [ROLES.ADMIN, ROLES.EDITOR, ROLES.USER],
  "courses:orders:read": [ROLES.ADMIN],
  "enrollments:manage": [ROLES.ADMIN],
  "cms:manage": [ROLES.ADMIN],
  "users:read": [ROLES.ADMIN],
  "users:manage": [ROLES.ADMIN],
};

const hasPermission = (role, permission) =>
  PERMISSIONS[permission]?.includes(role) ?? false;

module.exports = { ROLES, PERMISSIONS, hasPermission };
