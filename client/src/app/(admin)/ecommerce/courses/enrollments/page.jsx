import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, CardBody, Col, Form, Modal, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import ProjectsListTableSkeleton from '@/components/skeletons/ProjectsListTableSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import useFetchList from '@/hooks/useFetchList'
import Swal from 'sweetalert2'
import useConfirmFieldForm from '@/hooks/useConfirmFieldForm'
import StudentSelect from '../components/StudentSelect'
import LmsListEmptyState from '../components/LmsListEmptyState'
import useConfirmFormSubmit from '@/hooks/useConfirmFormSubmit'
import { buildFormConfirmOptions } from '@/utils/formConfirm'

const CourseEnrollments = () => {
  const { getAllEnrollments, getAllCourses, adminCreateEnrollment, revokeEnrollment } = useGlobalContext()
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 100 })
  const [showCreate, setShowCreate] = useState(false)
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState({ userId: '', courseId: '' })
  const [saving, setSaving] = useState(false)
  const confirmFormSubmit = useConfirmFormSubmit()

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

  const handleRevoke = useCallback(
    async (enrollment) => {
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
    },
    [revokeEnrollment, refresh],
  )

  const columns = useMemo(
    () => [
      {
        id: 'student',
        header: 'Student',
        cell: ({ row: { original: enrollment } }) => (
          <>
            {enrollment.userId?.firstname} {enrollment.userId?.lastname}
            <br />
            <small>{enrollment.userId?.email}</small>
          </>
        ),
      },
      {
        id: 'course',
        header: 'Course',
        cell: ({ row: { original: enrollment } }) => enrollment.courseId?.title,
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row: { original: enrollment } }) => (
          <Badge bg={enrollment.status === 'completed' ? 'success' : enrollment.status === 'revoked' ? 'secondary' : 'primary'}>
            {enrollment.status}
          </Badge>
        ),
      },
      {
        id: 'progress',
        header: 'Progress',
        cell: ({ row: { original: enrollment } }) => `${enrollment.progressPercent}%`,
      },
      {
        id: 'source',
        header: 'Source',
        cell: ({ row: { original: enrollment } }) => enrollment.source,
      },
      {
        id: 'enrolled',
        header: 'Enrolled',
        cell: ({ row: { original: enrollment } }) => new Date(enrollment.enrolledAt).toLocaleDateString(),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row: { original: enrollment } }) =>
          enrollment.status !== 'revoked' ? (
            <Button size="sm" variant="outline-danger" onClick={() => handleRevoke(enrollment)}>
              Revoke
            </Button>
          ) : null,
      },
    ],
    [handleRevoke],
  )

  const emptyState = <LmsListEmptyState preset="enrollments" inTable onPrimaryAction={() => setShowCreate(true)} />

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!form.userId || !form.courseId) {
      Swal.fire('Missing fields', 'Student and course are required.', 'warning')
      return
    }

    await confirmFormSubmit(buildFormConfirmOptions('enroll'), async () => {
      setSaving(true)
      try {
        await adminCreateEnrollment({
          userId: form.userId,
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
    })
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
                  <ReactTable
                    columns={columns}
                    data={enrollments}
                    rowsPerPageList={[5, 10, 20, 50]}
                    pageSize={10}
                    tableClass="text-nowrap mb-0 align-middle"
                    theadClass="bg-light bg-opacity-50"
                    showPagination={enrollments.length > 0}
                    emptyState={emptyState}
                  />
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
              <Form.Label>Student</Form.Label>
              <StudentSelect value={form.userId} onChange={(userId) => setForm((current) => ({ ...current, userId }))} />
              <Form.Text>Search by name, email, or username.</Form.Text>
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
