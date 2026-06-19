const { ROLES } = require("../constants/permissions");

const sameId = (a, b) => String(a) === String(b);

const isOwner = (actor, project) => {
  if (!actor || !project?.createdBy) return false;
  const creatorId = project.createdBy._id ?? project.createdBy;
  return sameId(actor._id, creatorId);
};

/**
 * Dashboard read access
 */
const canReadProject = (actor, project) => {
  if (!actor) return false;
  if (actor.role === ROLES.ADMIN || actor.role === ROLES.EDITOR) return true;
  if (isOwner(actor, project)) return true;
  return false;
};

/**
 * Edit / delete access
 */
const canWriteProject = (actor, project) => {
  if (!actor || !project) return false;
  if (actor.role === ROLES.ADMIN || actor.role === ROLES.EDITOR) return true;
  if (isOwner(actor, project)) return true;
  return false;
};

/**
 * Restore soft-deleted projects — staff or project owner
 */
const canRestoreProject = (actor, project) => {
  if (!actor || !project) return false;
  if (actor.role === ROLES.ADMIN || actor.role === ROLES.EDITOR) return true;
  return isOwner(actor, project);
};

/**
 * Permanent delete — staff only
 */
const canPermanentlyDeleteProject = (actor) => {
  if (!actor) return false;
  return actor.role === ROLES.ADMIN || actor.role === ROLES.EDITOR;
};

/**
 * Publish / unpublish — Users cannot change status
 */
const canPublishProject = (actor, project) => {
  if (!actor || !project) return false;
  if (actor.role === ROLES.USER) return false;
  if (actor.role === ROLES.ADMIN || actor.role === ROLES.EDITOR) return true;
  return false;
};

/**
 * MongoDB filter for dashboard project lists
 */
const getProjectListFilter = (actor) => {
  if (!actor) return { _id: null };
  if (actor.role === ROLES.ADMIN || actor.role === ROLES.EDITOR) return {};
  return { createdBy: actor._id };
};

module.exports = {
  canReadProject,
  canWriteProject,
  canRestoreProject,
  canPermanentlyDeleteProject,
  canPublishProject,
  getProjectListFilter,
  isOwner,
};
