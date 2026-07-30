import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, CardBody, Col, Form, Modal, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import ProjectsListTableSkeleton from '@/components/skeletons/ProjectsListTableSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import useFetchList from '@/hooks/useFetchList'
import Swal from 'sweetalert2'
import CourseSelect from '../components/CourseSelect'
import StudentSelect, { getEnrollmentUserId, isActiveEnrollmentStatus } from '../components/StudentSelect'
import LmsListEmptyState from '../components/LmsListEmptyState'
import LmsSectionNav from '../components/LmsSectionNav'
import useConfirmFormSubmit from '@/hooks/useConfirmFormSubmit'
import { buildFormConfirmOptions } from '@/utils/formConfirm'

const CourseEnrollments = () => {
  const { getAllEnrollments, getAllCourses, adminCreateEnrollment, revokeEnrollment } = useGlobalContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const enrollDeepLinkHandled = useRef(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 100 })
  const [showCreate, setShowCreate] = useState(false)
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState({ userId: '', courseId: '' })
  const [courseEnrollments, setCourseEnrollments] = useState([])
  const [saving, setSaving] = useState(false)
  const [reenrollingId, setReenrollingId] = useState(null)
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

  useEffect(() => {
    if (enrollDeepLinkHandled.current) return

    const shouldOpen = searchParams.get('enroll') === '1' || searchParams.get('openEnroll') === 'true'
    const courseId = searchParams.get('courseId') || ''
    const userId = searchParams.get('userId') || searchParams.get('studentId') || ''

    if (!shouldOpen && !courseId && !userId) return

    enrollDeepLinkHandled.current = true

    if (courseId || userId) {
      setForm((current) => ({
        ...current,
        ...(courseId ? { courseId } : {}),
        ...(userId ? { userId } : {}),
      }))
    }
    if (shouldOpen || courseId || userId) {
      setShowCreate(true)
    }

    const next = new URLSearchParams(searchParams)
    next.delete('enroll')
    next.delete('openEnroll')
    next.delete('courseId')
    next.delete('userId')
    next.delete('studentId')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!form.courseId) {
      setCourseEnrollments([])
      return
    }

    let cancelled = false
    getAllEnrollments({ courseId: form.courseId, page: 1, limit: 500 })
      .then((response) => {
        if (!cancelled) setCourseEnrollments(response.enrollments || [])
      })
      .catch(() => {
        if (!cancelled) setCourseEnrollments([])
      })

    return () => {
      cancelled = true
    }
  }, [form.courseId, getAllEnrollments])

  useEffect(() => {
    if (!form.userId || !form.courseId) return

    const alreadyEnrolled = courseEnrollments.some(
      (enrollment) => isActiveEnrollmentStatus(enrollment.status) && String(getEnrollmentUserId(enrollment)) === String(form.userId),
    )

    if (alreadyEnrolled) {
      setForm((current) => ({ ...current, userId: '' }))
    }
  }, [form.courseId, form.userId, courseEnrollments])

  const handleReenroll = useCallback(
    async (enrollment) => {
      const userId = getEnrollmentUserId(enrollment)
      const courseId = enrollment.courseId?._id ?? enrollment.courseId

      if (!userId || !courseId) {
        Swal.fire('Error', 'Missing student or course on this enrollment.', 'error')
        return
      }

      await confirmFormSubmit(
        buildFormConfirmOptions('enroll', {
          title: 'Re-enroll student?',
          text: `Restore access for ${enrollment.userId?.email || 'this student'} in "${enrollment.courseId?.title || 'this course'}"?`,
          confirmLabel: 'Re-enroll',
        }),
        async () => {
          setReenrollingId(enrollment._id)
          try {
            await adminCreateEnrollment({ userId, courseId })
            refresh()
            Swal.fire('Re-enrolled', 'The student has access to the course again.', 'success')
          } catch (error) {
            Swal.fire('Error', error?.response?.data?.message || 'Could not re-enroll student.', 'error')
          } finally {
            setReenrollingId(null)
          }
        },
      )
    },
    [adminCreateEnrollment, confirmFormSubmit, refresh],
  )

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
          enrollment.status === 'revoked' ? (
            <Button size="sm" variant="outline-primary" disabled={reenrollingId === enrollment._id} onClick={() => handleReenroll(enrollment)}>
              {reenrollingId === enrollment._id ? 'Re-enrolling…' : 'Re-enroll'}
            </Button>
          ) : (
            <Button size="sm" variant="outline-danger" onClick={() => handleRevoke(enrollment)}>
              Revoke
            </Button>
          ),
      },
    ],
    [handleRevoke, handleReenroll, reenrollingId],
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
        <Col className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <LmsSectionNav />
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
              <StudentSelect
                value={form.userId}
                courseId={form.courseId}
                courseEnrollments={courseEnrollments}
                onChange={(userId) => setForm((current) => ({ ...current, userId }))}
              />
              <Form.Text>
                Admins cannot be enrolled. Students already active in the selected course are disabled; revoked students can be re-enrolled.
              </Form.Text>
            </Form.Group>
            <Form.Group>
              <Form.Label>Course</Form.Label>
              <CourseSelect value={form.courseId} onChange={(courseId) => setForm((current) => ({ ...current, courseId }))} courses={courses} />
              <Form.Text>Search by course title or slug.</Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.userId || !form.courseId}>
              {saving ? 'Saving…' : 'Enroll'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}

export default CourseEnrollments
