export const buildContentBlocksFormData = (blocks, formData) => {
  const payload = []
  let imageIndex = 0

  blocks.forEach((block) => {
    if (block.type === 'image' && block.content instanceof File) {
      formData.append('blockImages', block.content)
      payload.push({ type: 'image', fileIndex: imageIndex })
      imageIndex += 1
    } else {
      payload.push({
        type: block.type,
        content: typeof block.content === 'string' ? block.content : '',
      })
    }
  })

  return payload
}

export const validateLessonForm = ({ lessonForm, editingLesson, videoFile, quizQuestions, contentBlocks }) => {
  if (!lessonForm.title?.trim()) {
    return 'Lesson title is required.'
  }

  if (lessonForm.type === 'video') {
    const hasExistingVideo = editingLesson?.video?.vdoCipherVideoId || editingLesson?.video?.gcsPath
    if (!videoFile && !hasExistingVideo) {
      return 'A video file is required for video lessons.'
    }
  }

  if (lessonForm.type === 'quiz') {
    if (!quizQuestions.length) {
      return 'Add at least one quiz question.'
    }
    for (let i = 0; i < quizQuestions.length; i += 1) {
      const q = quizQuestions[i]
      if (!q.prompt?.trim()) {
        return `Question ${i + 1} needs a prompt.`
      }
      const filledOptions = (q.options || []).filter((opt) => String(opt).trim())
      if (filledOptions.length < 2) {
        return `Question ${i + 1} needs at least two options.`
      }
      const correct = q.options[q.correctIndex]
      if (!String(correct || '').trim()) {
        return `Question ${i + 1} must have a valid correct answer.`
      }
    }
  }

  if (lessonForm.type === 'text' || lessonForm.type === 'download') {
    const hasContent = contentBlocks.some((block) => {
      if (block.type === 'image' && block.content instanceof File) return true
      return String(block.content || '').trim().length > 0
    })
    if (!hasContent && lessonForm.type === 'text') {
      return 'Add at least one content block for text lessons.'
    }
  }

  return null
}

export const getVideoStatusLabel = (lesson) => {
  const status = lesson?.video?.encodingStatus
  if (!lesson?.video?.vdoCipherVideoId && !lesson?.video?.gcsPath) {
    return 'No video attached'
  }
  if (status === 'ready') return 'Video ready'
  if (status === 'processing') return 'Video processing…'
  if (status === 'failed') return 'Video encoding failed'
  return status || 'Pending'
}

export const getLessonVideoBadge = (lesson) => {
  if (lesson?.type !== 'video') return null

  const hasVideo = lesson?.video?.vdoCipherVideoId || lesson?.video?.gcsPath
  const status = lesson?.video?.encodingStatus

  if (!hasVideo) {
    return { variant: 'missing', label: 'No video' }
  }
  if (status === 'ready') return null
  if (status === 'processing') return { variant: 'encoding', label: 'Encoding' }
  if (status === 'failed') return { variant: 'encoding', label: 'Encoding failed' }
  return { variant: 'encoding', label: 'Video pending' }
}
