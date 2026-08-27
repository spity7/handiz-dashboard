export const MIN_COURSE_MARKETING_VIDEOS = 4
export const MAX_COURSE_MARKETING_VIDEOS = 7

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

export const validateMarketingVideosForSave = (slots) => {
  const filledCount = serializeMarketingVideosForApi(slots).length

  if (filledCount === 0) {
    return null
  }

  if (filledCount < MIN_COURSE_MARKETING_VIDEOS) {
    return `Add at least ${MIN_COURSE_MARKETING_VIDEOS} preview video links, or leave them all empty.`
  }

  if (filledCount > MAX_COURSE_MARKETING_VIDEOS) {
    return `You can add at most ${MAX_COURSE_MARKETING_VIDEOS} preview video links.`
  }

  return null
}
