import { LMS_SITE_URL } from '@/config/api'

export function buildLmsCourseUrl(slug) {
  if (!slug) return LMS_SITE_URL
  const base = LMS_SITE_URL.replace(/\/$/, '')
  return `${base}/courses/${encodeURIComponent(slug)}`
}

export function buildLmsLearnUrl(slug, lessonSlug) {
  const courseUrl = buildLmsCourseUrl(slug)
  if (!lessonSlug) return courseUrl
  return `${courseUrl}/learn/${encodeURIComponent(lessonSlug)}`
}
