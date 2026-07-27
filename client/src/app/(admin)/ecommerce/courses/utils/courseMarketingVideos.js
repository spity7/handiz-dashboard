export const MAX_COURSE_MARKETING_VIDEOS = 3

export const emptyMarketingVideoSlots = () =>
  Array.from({ length: MAX_COURSE_MARKETING_VIDEOS }, () => ({
    url: '',
  }))

export const marketingVideosFromCourse = (videos) => {
  const slots = emptyMarketingVideoSlots()
  if (!Array.isArray(videos)) return slots

  videos
    .slice(0, MAX_COURSE_MARKETING_VIDEOS)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .forEach((video, index) => {
      slots[index] = {
        url: video?.url || '',
      }
    })

  return slots
}

export const serializeMarketingVideosForApi = (slots) =>
  slots
    .map((slot, order) => ({
      url: String(slot.url || '').trim(),
      order,
    }))
    .filter((slot) => slot.url)

export const marketingVideosFormDirty = (current, saved) => {
  const a = serializeMarketingVideosForApi(current)
  const b = serializeMarketingVideosForApi(saved)
  return JSON.stringify(a) !== JSON.stringify(b)
}
