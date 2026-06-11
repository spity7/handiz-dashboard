const { ROLES } = require("../constants/permissions");

const sameId = (a, b) => String(a) === String(b);

const isOwner = (actor, project) => {
  if (!actor || !project?.createdBy) return false;
  const creatorId = project.createdBy._id ?? project.createdBy;
  return sameId(actor._id, creatorId);
};

const isUserCreatedProject = (project) => project?.createdByRole === ROLES.USER;

/**
 * Dashboard read access
 */
const canReadProject = (actor, project) => {
  if (!actor) return false;
  if (actor.role === ROLES.ADMIN) return true;
  if (isOwner(actor, project)) return true;
  if (actor.role === ROLES.EDITOR && isUserCreatedProject(project)) return true;
  return false;
};

/**
 * Edit / delete access
 */
const canWriteProject = (actor, project) => {
  if (!actor || !project) return false;
  if (actor.role === ROLES.ADMIN) return true;
  if (isOwner(actor, project)) return true;
  if (actor.role === ROLES.EDITOR && isUserCreatedProject(project)) return true;
  return false;
};

/**
 * Publish / unpublish — Users cannot change status
 */
const canPublishProject = (actor, project) => {
  if (!actor || !project) return false;
  if (actor.role === ROLES.USER) return false;
  if (actor.role === ROLES.ADMIN) return true;
  if (actor.role === ROLES.EDITOR) {
    return isOwner(actor, project) || isUserCreatedProject(project);
  }
  return false;
};

/**
 * MongoDB filter for dashboard project lists
 */
const getProjectListFilter = (actor) => {
  if (!actor) return { _id: null };
  if (actor.role === ROLES.ADMIN) return {};
  if (actor.role === ROLES.EDITOR) {
    return {
      $or: [{ createdBy: actor._id }, { createdByRole: ROLES.USER }],
    };
  }
  return { createdBy: actor._id };
};

module.exports = {
  canReadProject,
  canWriteProject,
  canPublishProject,
  getProjectListFilter,
  isOwner,
  isUserCreatedProject,
};
