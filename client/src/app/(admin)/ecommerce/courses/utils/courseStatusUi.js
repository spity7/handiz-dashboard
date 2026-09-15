/** Server lessonCount counts lessons with isPublished: true only. */
export const PUBLISH_REQUIRES_PUBLISHED_LESSON = 'Publish becomes available after at least one lesson is marked Published in the curriculum.'

export const formatCourseStatusChangeNotice = (previousStatus, nextStatus) => {
  if (!previousStatus || !nextStatus || previousStatus === nextStatus) {
    return ''
  }

  if (previousStatus === 'Published' && nextStatus === 'Draft') {
    return 'Course status is now Draft because there are no published lessons left.'
  }

  return `Course status changed from ${previousStatus} to ${nextStatus}.`
}

export const courseRevertNoticeFromApi = (result) =>
  result?.courseRevertedToDraft ? result.courseStatusMessage || 'Course moved to Draft because it has no published lessons.' : ''

/** Combine a success line with API revert payload or a status diff after refresh. */
export const appendCourseStatusNotice = (baseMessage, { beforeStatus, afterStatus, apiResult } = {}) => {
  const fromApi = courseRevertNoticeFromApi(apiResult)
  if (fromApi) {
    return `${baseMessage}\n\n${fromApi}`
  }

  const fromRefresh = formatCourseStatusChangeNotice(beforeStatus, afterStatus)
  if (fromRefresh) {
    return `${baseMessage}\n\n${fromRefresh}`
  }

  return baseMessage
}
