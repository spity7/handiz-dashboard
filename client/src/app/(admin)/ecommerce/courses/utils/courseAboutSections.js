import { MAX_ABOUT_COURSE_SECTIONS, MAX_ITEMS_PER_SECTION } from './courseAboutSectionsConstants.js'

export { MAX_ABOUT_COURSE_SECTIONS, MAX_ITEMS_PER_SECTION }

export const emptyAboutCourseSection = () => ({
  title: '',
  items: [''],
})

export const aboutCourseSectionsFromCourse = (sections) => {
  if (!Array.isArray(sections) || sections.length === 0) {
    return [emptyAboutCourseSection()]
  }

  return sections
    .slice(0, MAX_ABOUT_COURSE_SECTIONS)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((section) => ({
      title: section?.title || '',
      items: Array.isArray(section?.items) && section.items.length ? section.items.map((item) => String(item || '').trim()).filter(Boolean) : [''],
    }))
    .map((section) => ({
      title: section.title,
      items: section.items.length ? section.items : [''],
    }))
}

export const serializeAboutCourseSectionsForApi = (sections) =>
  sections
    .map((section, order) => {
      const title = String(section.title || '').trim()
      const items = (section.items || []).map((item) => String(item || '').trim()).filter(Boolean)
      return { title, items, order }
    })
    .filter((section) => section.title || section.items.length)

export const aboutCourseSectionsFormDirty = (current, saved) => {
  const a = serializeAboutCourseSectionsForApi(current)
  const b = serializeAboutCourseSectionsForApi(saved)
  return JSON.stringify(a) !== JSON.stringify(b)
}
