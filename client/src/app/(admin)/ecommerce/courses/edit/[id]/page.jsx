import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Accordion, Alert, Badge, Button, Card, CardBody, Col, Form, Modal, Row, Spinner } from 'react-bootstrap'
import { useParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import CourseEditPageSkeleton from '@/components/skeletons/CourseEditPageSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import CourseForm from '../../components/CourseForm'
import LessonContentBlocksEditor, { mapContentBlocksFromApi } from '../../components/LessonContentBlocksEditor'
import { buildContentBlocksFormData, getLessonVideoBadge, getVideoStatusLabel, validateLessonForm } from '../../components/lessonFormUtils'
import CurriculumReorderDock from '../../components/CurriculumReorderDock'
import { uploadVideoToVdocipher } from '@/utils/uploadVideoToVdocipher'

const apiErrorMessage = (error, fallback) => {
  const data = error?.response?.data
  if (data == null) return error?.message || fallback
  if (typeof data === 'string') return data.trim() || fallback
  if (typeof data.message === 'string') return data.message
  if (typeof data.error === 'string') return data.error
  return fallback
}

const courseRevertNotice = (result) =>
  result?.courseRevertedToDraft ? result.courseStatusMessage || 'Course moved to Draft because it has no published lessons.' : ''

const cloneCurriculum = (items) => JSON.parse(JSON.stringify(items || []))

const LESSON_TYPE_ICONS = {
  video: 'bx:play-circle',
  text: 'bx:file-blank',
  quiz: 'bx:help-circle',
  download: 'bx:download',
}

const formatLessonType = (type) => type.charAt(0).toUpperCase() + type.slice(1)

const getLessonSaveLabel = (phase) => {
  if (phase === 'uploading') return 'Uploading video…'
  if (phase === 'saving') return 'Saving lesson…'
  return 'Save Lesson'
}

const ModalSavingOverlay = ({ message }) => (
  <div className="course-modal-saving__overlay" role="status" aria-live="polite">
    <Spinner animation="border" size="sm" />
    <span>{message}</span>
  </div>
)

const LESSON_STATUS_LABELS = {
  preview: 'Free preview',
  unpublished: 'Unpublished',
}

const LessonStatusBadge = ({ variant, children }) => <span className={`course-curriculum-badge course-curriculum-badge--${variant}`}>{children}</span>

const serializeCurriculumOrder = (items) =>
  (items || []).map((mod) => ({
    id: mod._id,
    lessons: (mod.lessons || []).map((lesson) => lesson._id),
  }))

const ReorderArrow = ({ direction, disabled, onClick, label }) => (
  <button
    type="button"
    className="course-curriculum-reorder-btn"
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation()
      onClick()
    }}
    aria-label={label}
    title={label}>
    <IconifyIcon icon={direction === 'up' ? 'bx:chevron-up' : 'bx:chevron-down'} />
  </button>
)

const ReorderGrip = ({ onDragStart, onDragEnd }) => (
  <span className="course-curriculum-grip" draggable onDragStart={onDragStart} onDragEnd={onDragEnd} aria-hidden="true" title="Drag to reorder">
    <IconifyIcon icon="bx:grid-vertical" />
  </span>
)

const EditCourse = () => {
  const { id } = useParams()
  const {
    getCourseById,
    getCourseAnalytics,
    createCourseModule,
    updateCourseModule,
    deleteCourseModule,
    createLesson,
    updateLesson,
    deleteLesson,
    upsertQuiz,
    reorderCurriculum,
    getVdocipherUploadCredentials,
    deleteVdocipherVideo,
  } = useGlobalContext()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const hasLoadedOnceRef = useRef(false)
  const [course, setCourse] = useState(null)
  const [curriculum, setCurriculum] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [editingModule, setEditingModule] = useState(null)
  const [editingLesson, setEditingLesson] = useState(null)
  const [activeModuleId, setActiveModuleId] = useState(null)
  const [moduleForm, setModuleForm] = useState({ title: '', description: '', order: 0 })
  const [lessonForm, setLessonForm] = useState({
    title: '',
    type: 'video',
    isPreview: false,
    isPublished: true,
    durationSeconds: 0,
  })
  const [videoFile, setVideoFile] = useState(null)
  const [resourceFiles, setResourceFiles] = useState([])
  const [existingResources, setExistingResources] = useState([])
  const [contentBlocks, setContentBlocks] = useState([])
  const [savingLesson, setSavingLesson] = useState(false)
  const [lessonSavePhase, setLessonSavePhase] = useState('idle')
  const [savingModule, setSavingModule] = useState(false)
  const [deletingModuleId, setDeletingModuleId] = useState(null)
  const [deletingLessonId, setDeletingLessonId] = useState(null)
  const [quizQuestions, setQuizQuestions] = useState([])
  const [quizPassingScore, setQuizPassingScore] = useState(70)
  const [reorderMode, setReorderMode] = useState(false)
  const [draftCurriculum, setDraftCurriculum] = useState([])
  const [reorderBaseline, setReorderBaseline] = useState([])
  const [savingReorder, setSavingReorder] = useState(false)
  const [lastMovedId, setLastMovedId] = useState(null)
  const [dragItem, setDragItem] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  const displayCurriculum = reorderMode ? draftCurriculum : curriculum
  const actionsLocked = reorderMode || savingReorder || refreshing || Boolean(deletingModuleId) || Boolean(deletingLessonId)

  const hasReorderChanges = useMemo(() => {
    if (!reorderMode) return false
    return JSON.stringify(serializeCurriculumOrder(draftCurriculum)) !== JSON.stringify(serializeCurriculumOrder(reorderBaseline))
  }, [reorderMode, draftCurriculum, reorderBaseline])

  const expandedAccordionKeys = useMemo(() => displayCurriculum.map((_, idx) => String(idx)), [displayCurriculum])

  const curriculumStats = useMemo(() => {
    const modules = displayCurriculum.length
    const lessons = displayCurriculum.reduce((sum, mod) => sum + (mod.lessons?.length || 0), 0)
    return { modules, lessons }
  }, [displayCurriculum])

  useEffect(() => {
    document.body.classList.toggle('course-reorder-active', reorderMode)
    return () => document.body.classList.remove('course-reorder-active')
  }, [reorderMode])

  useEffect(() => {
    if (!lastMovedId) return undefined
    const timer = window.setTimeout(() => setLastMovedId(null), 700)
    return () => window.clearTimeout(timer)
  }, [lastMovedId])

  const loadCourse = useCallback(async () => {
    if (hasLoadedOnceRef.current) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const [data, stats] = await Promise.all([getCourseById(id), getCourseAnalytics(id)])
      setCourse(data.course)
      setCurriculum(data.curriculum || [])
      setAnalytics(stats)
      setReorderMode(false)
      setDraftCurriculum([])
      setReorderBaseline([])
      setDragItem(null)
      setDropTarget(null)
      hasLoadedOnceRef.current = true
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Failed to load course'), 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [getCourseById, getCourseAnalytics, id])

  useEffect(() => {
    loadCourse()
  }, [loadCourse])

  const openModuleModal = (mod = null) => {
    if (actionsLocked) return
    setEditingModule(mod)
    setModuleForm({
      title: mod?.title || '',
      description: mod?.description || '',
      order: mod?.order ?? curriculum.length,
    })
    setShowModuleModal(true)
  }

  const saveModule = async () => {
    if (!moduleForm.title.trim()) {
      Swal.fire('Validation', 'Module title is required.', 'warning')
      return
    }

    try {
      setSavingModule(true)
      if (editingModule) {
        await updateCourseModule(id, editingModule._id, moduleForm)
      } else {
        await createCourseModule(id, moduleForm)
      }
      setShowModuleModal(false)
      await loadCourse()
      await Swal.fire('Saved', editingModule ? 'Module updated successfully.' : 'Module added successfully.', 'success')
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Failed to save module'), 'error')
    } finally {
      setSavingModule(false)
    }
  }

  const handleDeleteModule = async (moduleId) => {
    if (actionsLocked) return
    const result = await Swal.fire({
      title: 'Delete module?',
      text: 'This will delete the module and all lessons inside it.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    })
    if (!result.isConfirmed) return

    try {
      setDeletingModuleId(moduleId)
      const result = await deleteCourseModule(id, moduleId)
      await loadCourse()
      const revertNotice = courseRevertNotice(result)
      await Swal.fire('Deleted', revertNotice ? `Module removed successfully.\n\n${revertNotice}` : 'Module removed successfully.', 'success')
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Failed to delete module'), 'error')
    } finally {
      setDeletingModuleId(null)
    }
  }

  const handleLessonTypeChange = (nextType) => {
    setLessonForm((prev) => ({ ...prev, type: nextType }))
    if (nextType !== 'video') setVideoFile(null)
    if (nextType !== 'text' && nextType !== 'download') setContentBlocks([])
    if (nextType !== 'download') {
      setResourceFiles([])
      setExistingResources([])
    }
    if (nextType !== 'quiz') setQuizQuestions([])
  }

  const openLessonModal = (moduleId, lesson = null) => {
    if (actionsLocked) return
    const mod = curriculum.find((item) => item._id === moduleId)
    const nextOrder = mod?.lessons?.length ?? 0

    setActiveModuleId(moduleId)
    setEditingLesson(lesson)
    setLessonForm({
      title: lesson?.title || '',
      type: lesson?.type || 'video',
      isPreview: lesson?.isPreview || false,
      isPublished: lesson?.isPublished !== false,
      durationSeconds: lesson?.video?.durationSeconds || 0,
    })
    setVideoFile(null)
    setResourceFiles([])
    setExistingResources(lesson?.resources || [])
    setContentBlocks(mapContentBlocksFromApi(lesson?.contentBlocks || []))
    setQuizPassingScore(lesson?.quiz?.passingScore ?? 70)
    setQuizQuestions(
      lesson?.quiz?.questions?.length
        ? lesson.quiz.questions.map((q) => ({
            prompt: q.prompt || '',
            options: q.options?.length ? [...q.options] : ['', '', '', ''],
            correctIndex: q.correctIndex ?? 0,
          }))
        : [],
    )
    setShowLessonModal(true)
  }

  const startReorder = () => {
    const snapshot = cloneCurriculum(curriculum)
    setReorderBaseline(snapshot)
    setDraftCurriculum(snapshot)
    setReorderMode(true)
    setDragItem(null)
    setDropTarget(null)
  }

  const cancelReorder = () => {
    if (hasReorderChanges) {
      Swal.fire({
        title: 'Discard order changes?',
        text: 'Your reorder changes will be lost.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Discard',
        cancelButtonText: 'Keep editing',
      }).then((result) => {
        if (result.isConfirmed) {
          setDraftCurriculum([])
          setReorderBaseline([])
          setReorderMode(false)
          setDragItem(null)
          setDropTarget(null)
        }
      })
      return
    }
    setDraftCurriculum([])
    setReorderBaseline([])
    setReorderMode(false)
    setDragItem(null)
    setDropTarget(null)
  }

  const resetReorder = () => {
    setDraftCurriculum(cloneCurriculum(reorderBaseline))
    setDragItem(null)
    setDropTarget(null)
  }

  const confirmReorder = async () => {
    setSavingReorder(true)
    try {
      const payload = draftCurriculum.map((mod, modIndex) => ({
        _id: mod._id,
        order: modIndex,
        lessons: (mod.lessons || []).map((lesson, lessonIndex) => ({
          _id: lesson._id,
          order: lessonIndex,
        })),
      }))
      const result = await reorderCurriculum(id, payload)
      setCurriculum(result.curriculum || draftCurriculum)
      setReorderMode(false)
      setDraftCurriculum([])
      setReorderBaseline([])
      setDragItem(null)
      setDropTarget(null)
      await loadCourse()
      await Swal.fire('Saved', 'Curriculum order updated.', 'success')
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Failed to reorder curriculum'), 'error')
    } finally {
      setSavingReorder(false)
    }
  }

  const moveModule = (moduleIndex, direction) => {
    const target = moduleIndex + direction
    if (target < 0 || target >= draftCurriculum.length) return
    const next = [...draftCurriculum]
    const [item] = next.splice(moduleIndex, 1)
    next.splice(target, 0, item)
    setDraftCurriculum(next)
    setLastMovedId(item._id)
  }

  const moveLesson = (moduleIndex, lessonIndex, direction) => {
    const lessons = [...(draftCurriculum[moduleIndex]?.lessons || [])]
    const target = lessonIndex + direction
    if (target < 0 || target >= lessons.length) return
    const [item] = lessons.splice(lessonIndex, 1)
    lessons.splice(target, 0, item)
    const next = draftCurriculum.map((mod, idx) => (idx === moduleIndex ? { ...mod, lessons } : mod))
    setDraftCurriculum(next)
    setLastMovedId(item._id)
  }

  const placeLesson = (fromModuleIndex, fromLessonIndex, toModuleIndex, toLessonIndex) => {
    const next = cloneCurriculum(draftCurriculum)
    const fromLessons = [...(next[fromModuleIndex]?.lessons || [])]
    const [moved] = fromLessons.splice(fromLessonIndex, 1)
    if (!moved) return

    next[fromModuleIndex] = { ...next[fromModuleIndex], lessons: fromLessons }

    const toLessons = [...(next[toModuleIndex]?.lessons || [])]
    let insertAt = toLessonIndex
    if (fromModuleIndex === toModuleIndex && fromLessonIndex < toLessonIndex) {
      insertAt -= 1
    }
    toLessons.splice(insertAt, 0, moved)
    next[toModuleIndex] = { ...next[toModuleIndex], lessons: toLessons }

    setDraftCurriculum(next)
    setLastMovedId(moved._id)
  }

  const placeModule = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return
    const next = [...draftCurriculum]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setDraftCurriculum(next)
    setLastMovedId(moved._id)
  }

  const handleModuleDragStart = (moduleIndex) => {
    setDragItem({ kind: 'module', moduleIndex })
  }

  const handleLessonDragStart = (moduleIndex, lessonIndex) => {
    setDragItem({ kind: 'lesson', moduleIndex, lessonIndex })
  }

  const handleDragEnd = () => {
    setDragItem(null)
    setDropTarget(null)
  }

  const handleModuleDrop = (toIndex) => {
    if (!dragItem) return
    if (dragItem.kind === 'module') {
      placeModule(dragItem.moduleIndex, toIndex)
    } else if (dragItem.kind === 'lesson') {
      const targetLessons = draftCurriculum[toIndex]?.lessons || []
      placeLesson(dragItem.moduleIndex, dragItem.lessonIndex, toIndex, targetLessons.length)
    }
    handleDragEnd()
  }

  const handleLessonDrop = (toModuleIndex, toLessonIndex) => {
    if (dragItem?.kind !== 'lesson') return
    placeLesson(dragItem.moduleIndex, dragItem.lessonIndex, toModuleIndex, toLessonIndex)
    handleDragEnd()
  }

  const isDropTarget = (kind, moduleIndex, lessonIndex = null) => {
    if (!dropTarget || dropTarget.kind !== kind) return false
    if (dropTarget.moduleIndex !== moduleIndex) return false
    if (kind === 'lesson') return dropTarget.lessonIndex === lessonIndex
    return true
  }

  const saveLesson = async () => {
    const validationError = validateLessonForm({
      lessonForm,
      editingLesson,
      videoFile,
      quizQuestions,
      contentBlocks,
    })
    if (validationError) {
      Swal.fire('Validation', validationError, 'warning')
      return
    }

    let uploadedVideoId = null

    try {
      setSavingLesson(true)
      setLessonSavePhase('saving')
      const formData = new FormData()
      const mod = curriculum.find((item) => item._id === activeModuleId)
      const lessonOrder = editingLesson ? editingLesson.order : mod?.lessons?.length ?? 0

      formData.append('moduleId', activeModuleId)
      formData.append('title', lessonForm.title)
      formData.append('type', lessonForm.type)
      formData.append('order', String(lessonOrder))
      formData.append('isPreview', String(lessonForm.isPreview))
      formData.append('isPublished', String(lessonForm.isPublished))

      if (lessonForm.type === 'video' && lessonForm.durationSeconds) {
        formData.append('durationSeconds', String(lessonForm.durationSeconds))
      }

      if (lessonForm.type === 'text' || lessonForm.type === 'download') {
        const blocksPayload = buildContentBlocksFormData(contentBlocks, formData)
        formData.append('contentBlocks', JSON.stringify(blocksPayload))
      }

      if (lessonForm.type === 'download') {
        formData.append('resources', JSON.stringify(existingResources))
        resourceFiles.forEach((file) => formData.append('resources', file))
      }

      if (videoFile && lessonForm.type === 'video') {
        setLessonSavePhase('uploading')
        uploadedVideoId = await uploadVideoToVdocipher(videoFile, {
          title: lessonForm.title,
          courseId: id,
          moduleTitle: mod?.title,
          getCredentials: getVdocipherUploadCredentials,
        })
        formData.append('vdoCipherVideoId', uploadedVideoId)
        setLessonSavePhase('saving')
      }

      let lessonId = editingLesson?._id
      let lessonResult = null
      if (editingLesson) {
        lessonResult = await updateLesson(id, editingLesson._id, formData)
      } else {
        lessonResult = await createLesson(id, formData)
        lessonId = lessonResult.lesson._id
      }

      if (lessonForm.type === 'quiz' && lessonId) {
        await upsertQuiz(id, lessonId, {
          passingScore: quizPassingScore,
          questions: JSON.stringify(quizQuestions),
        })
      }

      setShowLessonModal(false)
      await loadCourse()
      const revertNotice = courseRevertNotice(lessonResult)
      const savedMessage = editingLesson ? 'Lesson updated successfully.' : 'Lesson added successfully.'
      await Swal.fire('Saved', revertNotice ? `${savedMessage}\n\n${revertNotice}` : savedMessage, 'success')
    } catch (error) {
      if (uploadedVideoId) {
        try {
          await deleteVdocipherVideo(uploadedVideoId)
        } catch (cleanupError) {
          console.warn('Failed to roll back VdoCipher upload:', cleanupError)
        }
      }
      Swal.fire('Error', apiErrorMessage(error, 'Failed to save lesson'), 'error')
    } finally {
      setSavingLesson(false)
      setLessonSavePhase('idle')
    }
  }

  const handleDeleteLesson = async (lessonId) => {
    if (actionsLocked) return
    const result = await Swal.fire({
      title: 'Delete lesson?',
      text: 'This lesson will be permanently removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    })
    if (!result.isConfirmed) return

    try {
      setDeletingLessonId(lessonId)
      const result = await deleteLesson(id, lessonId)
      await loadCourse()
      const revertNotice = courseRevertNotice(result)
      await Swal.fire('Deleted', revertNotice ? `Lesson removed successfully.\n\n${revertNotice}` : 'Lesson removed successfully.', 'success')
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Failed to delete lesson'), 'error')
    } finally {
      setDeletingLessonId(null)
    }
  }

  const addQuizQuestion = () => {
    setQuizQuestions((prev) => [...prev, { prompt: '', options: ['', '', '', ''], correctIndex: 0 }])
  }

  const removeQuizQuestion = (index) => {
    setQuizQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  if (loading) {
    return <CourseEditPageSkeleton title="Edit Course" />
  }

  if (!course) return <div className="p-4">Course not found</div>

  return (
    <>
      <PageMetaData title={`Edit: ${course.title}`} />
      <PageBreadcrumb title={course.title} subName="Course Editor" />

      {analytics && (
        <Row className="mb-3">
          <Col md={3}>
            <Card>
              <CardBody>
                <small className="text-muted">Enrollments</small>
                <h4>{analytics.totalEnrollments}</h4>
              </CardBody>
            </Card>
          </Col>
          <Col md={3}>
            <Card>
              <CardBody>
                <small className="text-muted">Completed</small>
                <h4>{analytics.completedEnrollments}</h4>
              </CardBody>
            </Card>
          </Col>
          <Col md={3}>
            <Card>
              <CardBody>
                <small className="text-muted">Completion Rate</small>
                <h4>{analytics.completionRate}%</h4>
              </CardBody>
            </Card>
          </Col>
          <Col md={3}>
            <Card>
              <CardBody>
                <small className="text-muted">Avg Progress</small>
                <h4>{analytics.averageProgress}%</h4>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      <Card className={`mb-4 ${refreshing ? 'course-details-card--loading' : ''}`}>
        <CardBody>
          {refreshing && (
            <div className="course-panel-loading" role="status" aria-live="polite">
              <Spinner animation="border" size="sm" />
              <span>Refreshing course details…</span>
            </div>
          )}
          <h5 className="mb-3">Course Details</h5>
          <CourseForm course={course} onSaved={loadCourse} disabled={refreshing} />
        </CardBody>
      </Card>

      <Card
        className={`course-curriculum-card mb-4 ${reorderMode ? 'course-curriculum-card--reorder' : ''} ${refreshing ? 'course-curriculum-card--loading' : ''}`}>
        <CardBody className="course-curriculum-card__body">
          {refreshing && (
            <div className="course-panel-loading" role="status" aria-live="polite">
              <Spinner animation="border" size="sm" />
              <span>Refreshing curriculum…</span>
            </div>
          )}
          <div className="course-curriculum-header">
            <div className="course-curriculum-header__text">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h5 className="course-curriculum-header__title mb-0">Curriculum</h5>
                {reorderMode && (
                  <Badge bg="primary" className="course-curriculum-reorder-badge">
                    Reordering
                  </Badge>
                )}
              </div>
              {reorderMode ? (
                <p className="course-curriculum-header__meta mb-0">
                  Drag the grip handle or use arrows to move modules and lessons. Confirm when finished.
                </p>
              ) : curriculumStats.modules > 0 ? (
                <p className="course-curriculum-header__meta mb-0">
                  {curriculumStats.modules} module{curriculumStats.modules === 1 ? '' : 's'} · {curriculumStats.lessons} lesson
                  {curriculumStats.lessons === 1 ? '' : 's'}
                </p>
              ) : (
                <p className="course-curriculum-header__meta mb-0">Organize your course into modules and lessons.</p>
              )}
            </div>
            {!reorderMode && (
              <div className="course-curriculum-header__actions">
                <button type="button" className="course-curriculum-header__btn" disabled={!curriculum.length || actionsLocked} onClick={startReorder}>
                  <IconifyIcon icon="bx:sort" className="course-curriculum-header__btn-icon" />
                  Reorder
                </button>
                <button
                  type="button"
                  className="course-curriculum-header__btn course-curriculum-header__btn--primary"
                  disabled={actionsLocked}
                  onClick={() => openModuleModal()}>
                  <IconifyIcon icon="bx:plus" className="course-curriculum-header__btn-icon" />
                  Add Module
                </button>
              </div>
            )}
          </div>

          {displayCurriculum.length === 0 ? (
            <div className="course-curriculum-empty">
              <div className="course-curriculum-empty__icon">
                <IconifyIcon icon="bx:book-open" />
              </div>
              <h6 className="course-curriculum-empty__title">No modules yet</h6>
              <p className="course-curriculum-empty__text">Add your first module to start building the course curriculum.</p>
              {!reorderMode && (
                <button
                  type="button"
                  className="course-curriculum-header__btn course-curriculum-header__btn--primary"
                  disabled={actionsLocked}
                  onClick={() => openModuleModal()}>
                  <IconifyIcon icon="bx:plus" className="course-curriculum-header__btn-icon" />
                  Add Module
                </button>
              )}
            </div>
          ) : (
            <Accordion
              className="course-curriculum-accordion"
              flush
              alwaysOpen={reorderMode}
              activeKey={reorderMode ? expandedAccordionKeys : undefined}
              onSelect={reorderMode ? () => {} : undefined}>
              {displayCurriculum.map((mod, idx) => {
                const moduleDragging = dragItem?.kind === 'module' && dragItem.moduleIndex === idx
                const moduleDropOver = isDropTarget('module', idx)
                const moduleMoved = lastMovedId === mod._id

                return (
                  <Accordion.Item
                    eventKey={String(idx)}
                    key={mod._id}
                    className={[
                      reorderMode ? 'course-curriculum-module--reorder' : '',
                      moduleDragging ? 'course-curriculum-module--dragging' : '',
                      moduleDropOver ? 'course-curriculum-module--drag-over' : '',
                      moduleMoved ? 'course-curriculum-module--moved' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onDragOver={
                      reorderMode
                        ? (e) => {
                            e.preventDefault()
                            setDropTarget({ kind: 'module', moduleIndex: idx })
                          }
                        : undefined
                    }
                    onDrop={
                      reorderMode
                        ? (e) => {
                            e.preventDefault()
                            handleModuleDrop(idx)
                          }
                        : undefined
                    }>
                    <Accordion.Header>
                      <div className="course-curriculum-module-header">
                        {reorderMode ? (
                          <ReorderGrip
                            onDragStart={(e) => {
                              e.stopPropagation()
                              handleModuleDragStart(idx)
                            }}
                            onDragEnd={handleDragEnd}
                          />
                        ) : (
                          <span className="course-curriculum-module-index">M{idx + 1}</span>
                        )}
                        {reorderMode && <span className="course-curriculum-position">Module {idx + 1}</span>}
                        <div className="course-curriculum-module-header__content min-w-0">
                          <span className="course-curriculum-module-title text-truncate">{mod.title}</span>
                          {mod.description && !reorderMode && (
                            <span className="course-curriculum-module-description text-truncate">{mod.description}</span>
                          )}
                        </div>
                        <span className="course-curriculum-lesson-count">
                          {mod.lessons?.length || 0} lesson{(mod.lessons?.length || 0) === 1 ? '' : 's'}
                        </span>
                        {reorderMode && (
                          <div className="course-curriculum-reorder-group" onClick={(e) => e.stopPropagation()}>
                            <ReorderArrow direction="up" disabled={idx === 0} onClick={() => moveModule(idx, -1)} label="Move module up" />
                            <ReorderArrow
                              direction="down"
                              disabled={idx === displayCurriculum.length - 1}
                              onClick={() => moveModule(idx, 1)}
                              label="Move module down"
                            />
                          </div>
                        )}
                      </div>
                    </Accordion.Header>
                    <Accordion.Body>
                      {!reorderMode && (
                        <div className="course-curriculum-module-actions">
                          <Button size="sm" variant="outline-primary" disabled={actionsLocked} onClick={() => openModuleModal(mod)}>
                            <IconifyIcon icon="bx:edit" className="me-1" />
                            Edit module
                          </Button>
                          <Button size="sm" variant="outline-success" disabled={actionsLocked} onClick={() => openLessonModal(mod._id)}>
                            <IconifyIcon icon="bx:plus" className="me-1" />
                            Add lesson
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            disabled={actionsLocked || deletingModuleId === mod._id}
                            onClick={() => handleDeleteModule(mod._id)}>
                            {deletingModuleId === mod._id ? (
                              <Spinner animation="border" size="sm" />
                            ) : (
                              <>
                                <IconifyIcon icon="bx:trash" className="me-1" />
                                Delete
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                      <div className="course-curriculum-lessons">
                        {(mod.lessons || []).length === 0 && !reorderMode ? (
                          <div className="course-curriculum-lessons-empty">
                            <p className="mb-2">This module has no lessons yet.</p>
                            <Button size="sm" variant="soft-primary" onClick={() => openLessonModal(mod._id)}>
                              <IconifyIcon icon="bx:plus" className="me-1" />
                              Add first lesson
                            </Button>
                          </div>
                        ) : (
                          (mod.lessons || []).map((lesson, lessonIndex) => {
                            const lessonDragging = dragItem?.kind === 'lesson' && dragItem.moduleIndex === idx && dragItem.lessonIndex === lessonIndex
                            const lessonDropOver = isDropTarget('lesson', idx, lessonIndex)
                            const lessonMoved = lastMovedId === lesson._id
                            const videoBadge = getLessonVideoBadge(lesson)

                            return (
                              <div
                                key={lesson._id}
                                className={[
                                  'course-curriculum-lesson',
                                  reorderMode ? 'course-curriculum-row--reorder' : '',
                                  lessonDragging ? 'course-curriculum-row--dragging' : '',
                                  lessonDropOver ? 'course-curriculum-row--drag-over' : '',
                                  lessonMoved ? 'course-curriculum-row--moved' : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                                onDragOver={
                                  reorderMode
                                    ? (e) => {
                                        e.preventDefault()
                                        setDropTarget({ kind: 'lesson', moduleIndex: idx, lessonIndex })
                                      }
                                    : undefined
                                }
                                onDrop={
                                  reorderMode
                                    ? (e) => {
                                        e.preventDefault()
                                        handleLessonDrop(idx, lessonIndex)
                                      }
                                    : undefined
                                }>
                                <div className="course-curriculum-lesson__main">
                                  {reorderMode ? (
                                    <ReorderGrip
                                      onDragStart={(e) => {
                                        e.stopPropagation()
                                        handleLessonDragStart(idx, lessonIndex)
                                      }}
                                      onDragEnd={handleDragEnd}
                                    />
                                  ) : (
                                    <span className="course-curriculum-lesson__icon" aria-hidden="true">
                                      <IconifyIcon icon={LESSON_TYPE_ICONS[lesson.type] || 'bx:book'} />
                                    </span>
                                  )}
                                  {reorderMode && (
                                    <span className="course-curriculum-position">
                                      {idx + 1}.{lessonIndex + 1}
                                    </span>
                                  )}
                                  <div className="course-curriculum-lesson__content min-w-0">
                                    <div className="course-curriculum-lesson__title text-truncate">{lesson.title}</div>
                                    <div className="course-curriculum-lesson__meta">
                                      <span className="course-curriculum-lesson__type">{formatLessonType(lesson.type)}</span>
                                      {lesson.isPreview && <LessonStatusBadge variant="preview">{LESSON_STATUS_LABELS.preview}</LessonStatusBadge>}
                                      {!lesson.isPublished && (
                                        <LessonStatusBadge variant="unpublished">{LESSON_STATUS_LABELS.unpublished}</LessonStatusBadge>
                                      )}
                                      {videoBadge && <LessonStatusBadge variant={videoBadge.variant}>{videoBadge.label}</LessonStatusBadge>}
                                      {lesson.type === 'video' && lesson.video?.durationSeconds > 0 && (
                                        <span className="course-curriculum-lesson__duration">{Math.ceil(lesson.video.durationSeconds / 60)} min</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {reorderMode ? (
                                  <div className="course-curriculum-reorder-group flex-shrink-0">
                                    <ReorderArrow
                                      direction="up"
                                      disabled={lessonIndex === 0}
                                      onClick={() => moveLesson(idx, lessonIndex, -1)}
                                      label="Move lesson up"
                                    />
                                    <ReorderArrow
                                      direction="down"
                                      disabled={lessonIndex === (mod.lessons?.length || 0) - 1}
                                      onClick={() => moveLesson(idx, lessonIndex, 1)}
                                      label="Move lesson down"
                                    />
                                  </div>
                                ) : (
                                  <div className="course-curriculum-lesson__actions">
                                    <Button
                                      size="sm"
                                      variant="soft-primary"
                                      title="Edit lesson"
                                      aria-label={`Edit ${lesson.title}`}
                                      disabled={actionsLocked}
                                      onClick={() => openLessonModal(mod._id, lesson)}>
                                      <IconifyIcon icon="bx:edit" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="soft-danger"
                                      title="Delete lesson"
                                      aria-label={`Delete ${lesson.title}`}
                                      className={deletingLessonId === lesson._id ? 'course-action-btn--loading' : ''}
                                      disabled={actionsLocked || deletingLessonId === lesson._id}
                                      onClick={() => handleDeleteLesson(lesson._id)}>
                                      {deletingLessonId === lesson._id ? <Spinner animation="border" size="sm" /> : <IconifyIcon icon="bx:trash" />}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                      {reorderMode && (
                        <div
                          className={`course-curriculum-drop-end ${isDropTarget('lesson', idx, mod.lessons?.length || 0) ? 'course-curriculum-drop-end--active' : ''}`}
                          onDragOver={(e) => {
                            e.preventDefault()
                            setDropTarget({ kind: 'lesson', moduleIndex: idx, lessonIndex: mod.lessons?.length || 0 })
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            handleLessonDrop(idx, mod.lessons?.length || 0)
                          }}>
                          Drop lesson here to move to end of module
                        </div>
                      )}
                    </Accordion.Body>
                  </Accordion.Item>
                )
              })}
            </Accordion>
          )}
        </CardBody>
      </Card>

      {reorderMode && (
        <CurriculumReorderDock
          hasChanges={hasReorderChanges}
          saving={savingReorder}
          onConfirm={confirmReorder}
          onCancel={cancelReorder}
          onReset={resetReorder}
        />
      )}

      <Modal show={showModuleModal} onHide={() => !savingModule && setShowModuleModal(false)} backdrop={savingModule ? 'static' : true}>
        <Modal.Header closeButton={!savingModule}>
          <Modal.Title>{editingModule ? 'Edit Module' : 'Add Module'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="course-modal-saving">
          {savingModule && <ModalSavingOverlay message="Saving module…" />}
          <fieldset disabled={savingModule}>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                value={moduleForm.title}
                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                placeholder="e.g. Getting Started"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                placeholder="Optional overview for this module"
              />
            </Form.Group>
          </fieldset>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModuleModal(false)} disabled={savingModule}>
            Cancel
          </Button>
          <Button onClick={saveModule} disabled={savingModule}>
            {savingModule ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Saving…
              </>
            ) : (
              'Save Module'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showLessonModal} onHide={() => !savingLesson && setShowLessonModal(false)} backdrop={savingLesson ? 'static' : true} size="lg">
        <Modal.Header closeButton={!savingLesson}>
          <Modal.Title>{editingLesson ? 'Edit Lesson' : 'Add Lesson'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="course-modal-saving">
          {savingLesson && <ModalSavingOverlay message={lessonSavePhase === 'uploading' ? 'Uploading video to VdoCipher…' : 'Saving lesson…'} />}
          <fieldset disabled={savingLesson}>
            <Row>
              <Col md={editingLesson ? 6 : 8}>
                <Form.Group className="mb-3">
                  <Form.Label>Title</Form.Label>
                  <Form.Control
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                    placeholder="e.g. Welcome & course overview"
                  />
                </Form.Group>
              </Col>
              {editingLesson && (
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Module</Form.Label>
                    <Form.Select value={activeModuleId || ''} onChange={(e) => setActiveModuleId(e.target.value)}>
                      {curriculum.map((mod) => (
                        <option key={mod._id} value={mod._id}>
                          {mod.title}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              )}
              <Col md={editingLesson ? 6 : 4}>
                <Form.Group className="mb-3">
                  <Form.Label>Type</Form.Label>
                  <Form.Select value={lessonForm.type} onChange={(e) => handleLessonTypeChange(e.target.value)}>
                    <option value="video">Video</option>
                    <option value="text">Text</option>
                    <option value="quiz">Quiz</option>
                    <option value="download">Download</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Check
              type="checkbox"
              label="Preview lesson (free)"
              checked={lessonForm.isPreview}
              onChange={(e) => setLessonForm({ ...lessonForm, isPreview: e.target.checked })}
              className="mb-2"
            />
            <Form.Check
              type="checkbox"
              label="Published"
              checked={lessonForm.isPublished}
              onChange={(e) => setLessonForm({ ...lessonForm, isPublished: e.target.checked })}
              className="mb-3"
            />

            {lessonForm.type === 'video' && (
              <>
                {editingLesson && (
                  <Alert variant="secondary" className="py-2 small">
                    Current video: <strong>{getVideoStatusLabel(editingLesson)}</strong>
                    {editingLesson.video?.durationSeconds > 0 && (
                      <span className="ms-2">({Math.ceil(editingLesson.video.durationSeconds / 60)} min)</span>
                    )}
                  </Alert>
                )}
                <Form.Group className="mb-3">
                  <Form.Label>{editingLesson ? 'Replace video (optional)' : 'Video file'}</Form.Label>
                  <Form.Control type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
                  <Form.Text className="text-muted">Uploads to VdoCipher. Encoding completes via webhook — status updates automatically.</Form.Text>
                </Form.Group>
              </>
            )}

            {(lessonForm.type === 'text' || lessonForm.type === 'download') && (
              <LessonContentBlocksEditor blocks={contentBlocks} onChange={setContentBlocks} />
            )}

            {lessonForm.type === 'download' && (
              <div className="mb-3">
                <Form.Label>Downloadable resources</Form.Label>
                {existingResources.map((resource, index) => (
                  <div key={`${resource.url}-${index}`} className="d-flex align-items-center gap-2 mb-2">
                    <Form.Control size="sm" value={resource.title || resource.url} readOnly />
                    <Button size="sm" variant="outline-danger" onClick={() => setExistingResources((prev) => prev.filter((_, i) => i !== index))}>
                      Remove
                    </Button>
                  </div>
                ))}
                <Form.Control type="file" multiple onChange={(e) => setResourceFiles(Array.from(e.target.files || []))} />
                <Form.Text className="text-muted">Upload PDFs, ZIPs, images, or other files students can download.</Form.Text>
              </div>
            )}

            {lessonForm.type === 'quiz' && (
              <div className="mb-3">
                <Form.Group className="mb-3">
                  <Form.Label>Passing score (%)</Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    max={100}
                    value={quizPassingScore}
                    onChange={(e) => setQuizPassingScore(Number(e.target.value) || 70)}
                  />
                </Form.Group>
                <div className="d-flex justify-content-between mb-2">
                  <Form.Label className="mb-0">Quiz Questions</Form.Label>
                  <Button size="sm" variant="outline-primary" onClick={addQuizQuestion}>
                    Add Question
                  </Button>
                </div>
                {quizQuestions.length === 0 && <p className="text-muted small">No questions yet. Add at least one.</p>}
                {quizQuestions.map((q, qi) => (
                  <div key={qi} className="border rounded p-2 mb-2">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong className="small">Question {qi + 1}</strong>
                      <Button size="sm" variant="outline-danger" onClick={() => removeQuizQuestion(qi)}>
                        Remove
                      </Button>
                    </div>
                    <Form.Control
                      className="mb-2"
                      placeholder="Enter the question"
                      value={q.prompt}
                      onChange={(e) => {
                        const next = [...quizQuestions]
                        next[qi].prompt = e.target.value
                        setQuizQuestions(next)
                      }}
                    />
                    {q.options.map((opt, oi) => (
                      <Form.Control
                        key={oi}
                        className="mb-1"
                        size="sm"
                        placeholder={`Option ${oi + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const next = [...quizQuestions]
                          next[qi].options[oi] = e.target.value
                          setQuizQuestions(next)
                        }}
                      />
                    ))}
                    <Form.Select
                      size="sm"
                      className="mt-1"
                      value={q.correctIndex}
                      onChange={(e) => {
                        const next = [...quizQuestions]
                        next[qi].correctIndex = Number(e.target.value)
                        setQuizQuestions(next)
                      }}>
                      {q.options.map((_, oi) => (
                        <option key={oi} value={oi}>
                          Correct: Option {oi + 1}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                ))}
              </div>
            )}
          </fieldset>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLessonModal(false)} disabled={savingLesson}>
            Cancel
          </Button>
          <Button onClick={saveLesson} disabled={savingLesson}>
            {savingLesson ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {getLessonSaveLabel(lessonSavePhase)}
              </>
            ) : (
              'Save Lesson'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default EditCourse
