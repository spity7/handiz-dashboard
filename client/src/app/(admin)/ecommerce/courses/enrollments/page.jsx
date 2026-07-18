import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, CardBody, Col, Form, Modal, Row, Table } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ProjectsListTableSkeleton from '@/components/skeletons/ProjectsListTableSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import useFetchList from '@/hooks/useFetchList'
import Swal from 'sweetalert2'

const CourseEnrollments = () => {
  const { getAllEnrollments, getAllCourses, adminCreateEnrollment, revokeEnrollment } = useGlobalContext()
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 100 })
  const [showCreate, setShowCreate] = useState(false)
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState({ userId: '', courseId: '' })
  const [saving, setSaving] = useState(false)

  const fetchEnrollments = useCallback(async () => {
    const response = await getAllEnrollments({ page, limit: 100 })
    setPagination(response.pagination || { total: 0, totalPages: 1, limit: 100 })
    return response.enrollments || []
  }, [getAllEnrollments, page])

  const { items: enrollments, loading, refresh } = useFetchList(fetchEnrollments)

  useEffect(() => {
    getAllCourses(true)
      .then(setCourses)
      .catch(() => setCourses([]))
  }, [getAllCourses])

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!form.userId.trim() || !form.courseId) {
      Swal.fire('Missing fields', 'User ID and course are required.', 'warning')
      return
    }

    setSaving(true)
    try {
      await adminCreateEnrollment({
        userId: form.userId.trim(),
        courseId: form.courseId,
      })
      setShowCreate(false)
      setForm({ userId: '', courseId: '' })
      refresh()
      Swal.fire('Enrolled', 'The student has been enrolled.', 'success')
    } catch (error) {
      Swal.fire('Error', error?.response?.data?.message || 'Could not create enrollment.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async (enrollment) => {
    const result = await Swal.fire({
      title: 'Revoke enrollment?',
      text: `Remove ${enrollment.userId?.email || 'this student'} from "${enrollment.courseId?.title || 'the course'}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Revoke',
      confirmButtonColor: '#dc3545',
    })

    if (!result.isConfirmed) return

    try {
      await revokeEnrollment(enrollment._id)
      refresh()
      Swal.fire('Revoked', 'Enrollment has been revoked.', 'success')
    } catch (error) {
      Swal.fire('Error', error?.response?.data?.message || 'Could not revoke enrollment.', 'error')
    }
  }

  return (
    <>
      <PageMetaData title="Course Enrollments" />
      <PageBreadcrumb title="Enrollments" subName="LMS" />
      <Row className="mb-3">
        <Col className="d-flex justify-content-end">
          <Button onClick={() => setShowCreate(true)}>Enroll Student</Button>
        </Col>
      </Row>
      <Row>
        <Col>
          <Card>
            <CardBody>
              {loading ? (
                <ProjectsListTableSkeleton />
              ) : (
                <>
                  <div className="table-responsive">
                    <Table hover>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Course</th>
                          <th>Status</th>
                          <th>Progress</th>
                          <th>Source</th>
                          <th>Enrolled</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map((e) => (
                          <tr key={e._id}>
                            <td>
                              {e.userId?.firstname} {e.userId?.lastname}
                              <br />
                              <small>{e.userId?.email}</small>
                            </td>
                            <td>{e.courseId?.title}</td>
                            <td>
                              <Badge bg={e.status === 'completed' ? 'success' : e.status === 'revoked' ? 'secondary' : 'primary'}>{e.status}</Badge>
                            </td>
                            <td>{e.progressPercent}%</td>
                            <td>{e.source}</td>
                            <td>{new Date(e.enrolledAt).toLocaleDateString()}</td>
                            <td>
                              {e.status !== 'revoked' && (
                                <Button size="sm" variant="outline-danger" onClick={() => handleRevoke(e)}>
                                  Revoke
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  {pagination.totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <small className="text-muted">
                        Page {page} of {pagination.totalPages} ({pagination.total} total)
                      </small>
                      <div className="d-flex gap-2">
                        <Button size="sm" variant="outline-secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          disabled={page >= pagination.totalPages}
                          onClick={() => setPage((current) => current + 1)}>
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Modal show={showCreate} onHide={() => setShowCreate(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Enroll Student</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreate}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>User ID</Form.Label>
              <Form.Control
                value={form.userId}
                onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))}
                placeholder="MongoDB user _id"
                required
              />
              <Form.Text>Paste the student&apos;s user ID from the Users section.</Form.Text>
            </Form.Group>
            <Form.Group>
              <Form.Label>Course</Form.Label>
              <Form.Select value={form.courseId} onChange={(event) => setForm((current) => ({ ...current, courseId: event.target.value }))} required>
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.title}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Enroll'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}

export default CourseEnrollments
