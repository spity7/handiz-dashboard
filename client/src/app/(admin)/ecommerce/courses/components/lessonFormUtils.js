export const PASSING_SCORE_MIN = 1
export const PASSING_SCORE_MAX = 100
export const PASSING_SCORE_DEFAULT = 70

export const clampPassingScore = (value, fallback = PASSING_SCORE_DEFAULT) => {
  const num = Number(value)
  if (Number.isNaN(num)) return fallback
  return Math.min(PASSING_SCORE_MAX, Math.max(PASSING_SCORE_MIN, num))
}

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

const serializeContentBlock = (block) => ({
  type: block.type,
  content:
    block.content instanceof File ? `file:${block.content.name}:${block.content.size}:${block.content.lastModified}` : String(block.content || ''),
})

const serializeFileRef = (file) => (file ? `file:${file.name}:${file.size}:${file.lastModified}` : null)

export const serializeLessonDraft = ({
  lessonForm,
  activeModuleId,
  quizPassingScore,
  quizQuestions,
  contentBlocks,
  existingResources,
  videoFile,
  resourceFiles,
}) =>
  JSON.stringify({
    activeModuleId: activeModuleId || '',
    lessonForm,
    quizPassingScore,
    quizQuestions,
    contentBlocks: contentBlocks.map(serializeContentBlock),
    existingResources,
    videoFile: serializeFileRef(videoFile),
    resourceFiles: resourceFiles.map(serializeFileRef),
  })

const hasContentBlocks = (contentBlocks) =>
  contentBlocks.some((block) => {
    if (block.type === 'image' && block.content instanceof File) return true
    return String(block.content || '').trim().length > 0
  })

const isQuizQuestionComplete = (question) => {
  if (!question.prompt?.trim()) return false

  const filledOptions = (question.options || []).filter((opt) => String(opt).trim())
  if (filledOptions.length < 2) return false

  const correct = question.options[question.correctIndex]
  return Boolean(String(correct || '').trim())
}

export const isLessonSaveReady = ({
  lessonForm,
  editingLesson,
  videoFile,
  quizQuestions,
  contentBlocks,
  existingResources = [],
  resourceFiles = [],
}) => {
  if (!lessonForm.title?.trim()) return false

  switch (lessonForm.type) {
    case 'video':
      return Boolean(videoFile || editingLesson?.video?.vdoCipherVideoId)
    case 'quiz':
      return quizQuestions.length > 0 && quizQuestions.every(isQuizQuestionComplete)
    case 'text':
      return hasContentBlocks(contentBlocks)
    case 'download':
      return hasContentBlocks(contentBlocks) || existingResources.length > 0 || resourceFiles.length > 0
    default:
      return false
  }
}

export const validateLessonForm = ({
  lessonForm,
  editingLesson,
  videoFile,
  quizQuestions,
  contentBlocks,
  quizPassingScore,
  existingResources = [],
  resourceFiles = [],
}) => {
  if (!lessonForm.title?.trim()) {
    return 'Lesson title is required.'
  }

  if (lessonForm.type === 'video') {
    const hasExistingVideo = editingLesson?.video?.vdoCipherVideoId
    if (!videoFile && !hasExistingVideo) {
      return 'A video file is required for video lessons.'
    }
  }

  if (lessonForm.type === 'quiz') {
    const score = Number(quizPassingScore)
    if (Number.isNaN(score) || score < PASSING_SCORE_MIN || score > PASSING_SCORE_MAX) {
      return `Passing score must be between ${PASSING_SCORE_MIN} and ${PASSING_SCORE_MAX}%.`
    }
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
    const hasContent = hasContentBlocks(contentBlocks)
    if (!hasContent && lessonForm.type === 'text') {
      return 'Add at least one content block for text lessons.'
    }
    if (!hasContent && lessonForm.type === 'download' && !existingResources?.length && !resourceFiles?.length) {
      return 'Add at least one content block or downloadable resource.'
    }
  }

  return null
}

export const getVideoStatusLabel = (lesson) => {
  const status = lesson?.video?.encodingStatus
  if (!lesson?.video?.vdoCipherVideoId) {
    return 'No video attached'
  }
  if (status === 'ready') return 'Video ready'
  if (status === 'processing') return 'Video processing…'
  if (status === 'failed') return 'Video encoding failed'
  return status || 'Pending'
}

export const getLessonVideoBadge = (lesson) => {
  if (lesson?.type !== 'video') return null

  const hasVideo = lesson?.video?.vdoCipherVideoId
  const status = lesson?.video?.encodingStatus

  if (!hasVideo) {
    return { variant: 'missing', label: 'No video' }
  }
  if (status === 'ready') return null
  if (status === 'processing') return { variant: 'encoding', label: 'Encoding' }
  if (status === 'failed') return { variant: 'encoding', label: 'Encoding failed' }
  return { variant: 'encoding', label: 'Video pending' }
}
