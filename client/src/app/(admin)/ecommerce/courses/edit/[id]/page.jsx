import { useCallback, useEffect, useState } from 'react'
import { Accordion, Badge, Button, Card, CardBody, Col, Form, Modal, Row, Spinner } from 'react-bootstrap'
import { useParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import CourseForm from '../../components/CourseForm'
import { uploadVideoToVdocipher } from '@/utils/uploadVideoToVdocipher'

const apiErrorMessage = (error, fallback) => {
  const data = error?.response?.data
  if (data == null) return error?.message || fallback
  if (typeof data === 'string') return data.trim() || fallback
  if (typeof data.message === 'string') return data.message
  if (typeof data.error === 'string') return data.error
  return fallback
}

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
    getVdocipherUploadCredentials,
  } = useGlobalContext()

  const [loading, setLoading] = useState(true)
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
    order: 0,
    isPreview: false,
    isPublished: true,
    durationSeconds: 0,
  })
  const [videoFile, setVideoFile] = useState(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState([])

  const loadCourse = useCallback(async () => {
    setLoading(true)
    try {
      const [data, stats] = await Promise.all([getCourseById(id), getCourseAnalytics(id)])
      setCourse(data.course)
      setCurriculum(data.curriculum || [])
      setAnalytics(stats)
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Failed to load course'), 'error')
    } finally {
      setLoading(false)
    }
  }, [getCourseById, getCourseAnalytics, id])

  useEffect(() => {
    loadCourse()
  }, [loadCourse])

  const openModuleModal = (mod = null) => {
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
      if (editingModule) {
        await updateCourseModule(id, editingModule._id, moduleForm)
        await Swal.fire('Saved', 'Module updated successfully.', 'success')
      } else {
        await createCourseModule(id, moduleForm)
        await Swal.fire('Created', 'Module added successfully.', 'success')
      }
      setShowModuleModal(false)
      loadCourse()
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Failed to save module'), 'error')
    }
  }

  const handleDeleteModule = async (moduleId) => {
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
      await deleteCourseModule(id, moduleId)
      await Swal.fire('Deleted', 'Module removed successfully.', 'success')
      loadCourse()
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Failed to delete module'), 'error')
    }
  }

  const openLessonModal = (moduleId, lesson = null) => {
    setActiveModuleId(moduleId)
    setEditingLesson(lesson)
    setLessonForm({
      title: lesson?.title || '',
      type: lesson?.type || 'video',
      order: lesson?.order ?? 0,
      isPreview: lesson?.isPreview || false,
      isPublished: lesson?.isPublished !== false,
      durationSeconds: lesson?.video?.durationSeconds || 0,
    })
    setVideoFile(null)
    setQuizQuestions([])
    setShowLessonModal(true)
  }

  const saveLesson = async () => {
    if (!lessonForm.title.trim()) {
      Swal.fire('Validation', 'Lesson title is required.', 'warning')
      return
    }

    try {
      setUploadingVideo(true)
      const formData = new FormData()
      formData.append('moduleId', activeModuleId)
      Object.entries(lessonForm).forEach(([key, value]) => {
        formData.append(key, value)
      })

      if (videoFile && lessonForm.type === 'video') {
        const videoId = await uploadVideoToVdocipher(videoFile, {
          title: lessonForm.title,
          getCredentials: getVdocipherUploadCredentials,
        })
        formData.append('vdoCipherVideoId', videoId)
      }

      let lessonId = editingLesson?._id
      if (editingLesson) {
        await updateLesson(id, editingLesson._id, formData)
      } else {
        const result = await createLesson(id, formData)
        lessonId = result.lesson._id
      }

      if (lessonForm.type === 'quiz' && lessonId && quizQuestions.length > 0) {
        await upsertQuiz(id, lessonId, {
          passingScore: 70,
          questions: JSON.stringify(quizQuestions),
        })
      }

      setShowLessonModal(false)
      await Swal.fire('Saved', editingLesson ? 'Lesson updated successfully.' : 'Lesson added successfully.', 'success')
      loadCourse()
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Failed to save lesson'), 'error')
    } finally {
      setUploadingVideo(false)
    }
  }

  const handleDeleteLesson = async (lessonId) => {
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
      await deleteLesson(id, lessonId)
      await Swal.fire('Deleted', 'Lesson removed successfully.', 'success')
      loadCourse()
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Failed to delete lesson'), 'error')
    }
  }

  const addQuizQuestion = () => {
    setQuizQuestions((prev) => [...prev, { prompt: '', options: ['', '', '', ''], correctIndex: 0 }])
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" />
      </div>
    )
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

      <Card className="mb-4">
        <CardBody>
          <h5 className="mb-3">Course Details</h5>
          <CourseForm course={course} onSaved={loadCourse} />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Curriculum</h5>
            <Button size="sm" onClick={() => openModuleModal()}>
              <IconifyIcon icon="bx:plus" className="me-1" />
              Add Module
            </Button>
          </div>

          {curriculum.length === 0 ? (
            <p className="text-muted">No modules yet. Add a module to start building curriculum.</p>
          ) : (
            <Accordion>
              {curriculum.map((mod, idx) => (
                <Accordion.Item eventKey={String(idx)} key={mod._id}>
                  <Accordion.Header>
                    <span className="me-2">{mod.title}</span>
                    <Badge bg="secondary">{mod.lessons?.length || 0} lessons</Badge>
                  </Accordion.Header>
                  <Accordion.Body>
                    <div className="d-flex gap-2 mb-3">
                      <Button size="sm" variant="outline-primary" onClick={() => openModuleModal(mod)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline-success" onClick={() => openLessonModal(mod._id)}>
                        Add Lesson
                      </Button>
                      <Button size="sm" variant="outline-danger" onClick={() => handleDeleteModule(mod._id)}>
                        Delete Module
                      </Button>
                    </div>
                    {(mod.lessons || []).map((lesson) => (
                      <div key={lesson._id} className="d-flex justify-content-between align-items-center border rounded p-2 mb-2">
                        <div>
                          <strong>{lesson.title}</strong>
                          <div className="small text-muted">
                            {lesson.type}
                            {lesson.isPreview && (
                              <Badge bg="info" className="ms-2">
                                Preview
                              </Badge>
                            )}
                            {lesson.video?.encodingStatus && lesson.video.encodingStatus !== 'ready' && (
                              <Badge bg="warning" className="ms-2 text-dark">
                                {lesson.video.encodingStatus}
                              </Badge>
                            )}
                            {lesson.video?.durationSeconds > 0 && <span className="ms-2">{Math.ceil(lesson.video.durationSeconds / 60)} min</span>}
                          </div>
                        </div>
                        <div className="d-flex gap-1">
                          <Button size="sm" variant="soft-primary" onClick={() => openLessonModal(mod._id, lesson)}>
                            <IconifyIcon icon="bx:edit" />
                          </Button>
                          <Button size="sm" variant="soft-danger" onClick={() => handleDeleteLesson(lesson._id)}>
                            <IconifyIcon icon="bx:trash" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </CardBody>
      </Card>

      <Modal show={showModuleModal} onHide={() => setShowModuleModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingModule ? 'Edit Module' : 'Add Module'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
          <Form.Group>
            <Form.Label>Order</Form.Label>
            <Form.Control
              type="number"
              value={moduleForm.order}
              onChange={(e) => setModuleForm({ ...moduleForm, order: Number(e.target.value) })}
              placeholder="0"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModuleModal(false)}>
            Cancel
          </Button>
          <Button onClick={saveModule}>Save Module</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showLessonModal} onHide={() => setShowLessonModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingLesson ? 'Edit Lesson' : 'Add Lesson'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Title</Form.Label>
                <Form.Control
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  placeholder="e.g. Welcome & course overview"
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Type</Form.Label>
                <Form.Select value={lessonForm.type} onChange={(e) => setLessonForm({ ...lessonForm, type: e.target.value })}>
                  <option value="video">Video</option>
                  <option value="text">Text</option>
                  <option value="quiz">Quiz</option>
                  <option value="download">Download</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Duration (sec)</Form.Label>
                <Form.Control
                  type="number"
                  value={lessonForm.durationSeconds}
                  onChange={(e) => setLessonForm({ ...lessonForm, durationSeconds: Number(e.target.value) })}
                  placeholder="e.g. 600"
                />
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
            <Form.Group className="mb-3">
              <Form.Label>Video file (uploads to VdoCipher)</Form.Label>
              <Form.Control type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
              <Form.Text className="text-muted">Video will encode in the background. Status updates via webhook when ready.</Form.Text>
            </Form.Group>
          )}
          {lessonForm.type === 'quiz' && (
            <div className="mb-3">
              <div className="d-flex justify-content-between mb-2">
                <Form.Label className="mb-0">Quiz Questions</Form.Label>
                <Button size="sm" variant="outline-primary" onClick={addQuizQuestion}>
                  Add Question
                </Button>
              </div>
              {quizQuestions.map((q, qi) => (
                <div key={qi} className="border rounded p-2 mb-2">
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
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLessonModal(false)}>
            Cancel
          </Button>
          <Button onClick={saveLesson} disabled={uploadingVideo}>
            {uploadingVideo ? 'Uploading...' : 'Save Lesson'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default EditCourse
