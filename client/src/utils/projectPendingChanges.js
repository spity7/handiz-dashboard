export const mergeProjectForEdit = (project) => {
  if (!project?.hasPendingChanges || !project?.pendingChanges) {
    return project
  }

  return {
    ...project,
    ...project.pendingChanges,
  }
}

export const mergeProjectForReview = (project, isStaff) => {
  if (!isStaff || !project?.hasPendingChanges || !project?.pendingChanges) {
    return project
  }

  return {
    ...project,
    ...project.pendingChanges,
    _isPendingReview: true,
  }
}

export const projectNeedsApproval = (project) =>
  Boolean(project && !project.deletedAt && (project.status !== 'Published' || project.hasPendingChanges))

export const projectPendingReviewLabel = (project) => {
  if (!project?.hasPendingChanges) return null
  if (project.status === 'Published') {
    return 'Pending review'
  }
  return null
}
