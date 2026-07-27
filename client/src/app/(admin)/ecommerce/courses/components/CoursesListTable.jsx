import clsx from 'clsx'
import { useCallback, useMemo, useState } from 'react'
import { Badge, Button, Form, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import Swal from 'sweetalert2'
import ReactTable from '@/components/Table'
import LmsListEmptyState from './LmsListEmptyState'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import { formatUsd, getPublicPriceDisplay } from '@/utils/coursePricing'

const ALL_FILTER = ''

const COURSE_STATUS = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
  REMOVED: 'Removed',
}

const PRICING_FILTER = {
  FREE: 'free',
  PAID: 'paid',
  ON_SALE: 'on_sale',
  FREE_OFFER_EXPIRED: 'free_offer_expired',
  DISCOUNT_EXPIRED: 'discount_expired',
}

const COURSE_ACTION = {
  REMOVE: 'remove',
  RESTORE: 'restore',
  PERMANENT_DELETE: 'permanent-delete',
}

const COURSE_ACTION_LABELS = {
  [COURSE_ACTION.REMOVE]: 'Removing course…',
  [COURSE_ACTION.RESTORE]: 'Restoring course…',
  [COURSE_ACTION.PERMANENT_DELETE]: 'Deleting course permanently…',
}

const apiErrorMessage = (error, fallback) => {
  const data = error?.response?.data
  if (data == null) return error?.message || fallback
  if (typeof data === 'string') return data.trim() || fallback
  if (typeof data.message === 'string') return data.message
  if (typeof data.error === 'string') return data.error
  return fallback
}

const statusVariant = (status) => {
  if (status === COURSE_STATUS.PUBLISHED) return 'success'
  if (status === COURSE_STATUS.ARCHIVED) return 'secondary'
  return 'warning'
}

const isCourseDeleted = (course) => Boolean(course?.deletedAt)

const COUNT_OPERATORS = {
  EQ: '=',
  GTE: '>=',
  LTE: '<=',
  GT: '>',
  LT: '<',
}

const matchesCountFilter = (value, operator, filterValue) => {
  if (!operator) return true
  const count = Number(value ?? 0)
  const target = Number(filterValue)
  if (!Number.isFinite(target)) return true

  switch (operator) {
    case COUNT_OPERATORS.EQ:
      return count === target
    case COUNT_OPERATORS.GTE:
      return count >= target
    case COUNT_OPERATORS.LTE:
      return count <= target
    case COUNT_OPERATORS.GT:
      return count > target
    case COUNT_OPERATORS.LT:
      return count < target
    default:
      return true
  }
}

const matchesCourseSearch = (course, query) => {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const title = (course.title || '').toLowerCase()
  const slug = (course.slug || '').toLowerCase()
  return title.includes(q) || slug.includes(q)
}

const matchesStatusFilter = (course, filter) => {
  if (!filter) return true
  if (filter === COURSE_STATUS.REMOVED) return isCourseDeleted(course)
  if (isCourseDeleted(course)) return false
  return course.status === filter
}

const matchesPricingFilter = (course, filter) => {
  if (!filter) return true
  const pricing = course.pricing
  const display = getPublicPriceDisplay(pricing)

  switch (filter) {
    case PRICING_FILTER.FREE:
      return display.isFree && !pricing?.freeOfferExpired
    case PRICING_FILTER.PAID:
      return !display.isFree && !display.compareAt && !pricing?.discountExpired && !pricing?.freeOfferExpired
    case PRICING_FILTER.ON_SALE:
      return display.compareAt != null && !pricing?.discountExpired && !pricing?.freeOfferExpired
    case PRICING_FILTER.FREE_OFFER_EXPIRED:
      return Boolean(pricing?.freeOfferExpired)
    case PRICING_FILTER.DISCOUNT_EXPIRED:
      return Boolean(pricing?.discountExpired)
    default:
      return true
  }
}

const TableHeaderSearch = ({ label, value, onChange, placeholder }) => (
  <Form.Control
    size="sm"
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="courses-table-filter"
    aria-label={label}
    placeholder={placeholder}
    autoComplete="off"
  />
)

const TableHeaderCountFilter = ({ label, operator, value, onOperatorChange, onValueChange }) => (
  <div className="d-flex gap-1 courses-table-count-filter">
    <Form.Select
      size="sm"
      value={operator}
      onChange={(e) => onOperatorChange(e.target.value)}
      className="courses-table-filter-op"
      aria-label={`${label} operator`}>
      <option value={ALL_FILTER}>Any</option>
      <option value={COUNT_OPERATORS.EQ}>Equal (=)</option>
      <option value={COUNT_OPERATORS.GTE}>At least (≥)</option>
      <option value={COUNT_OPERATORS.LTE}>At most (≤)</option>
      <option value={COUNT_OPERATORS.GT}>Greater (&gt;)</option>
      <option value={COUNT_OPERATORS.LT}>Less (&lt;)</option>
    </Form.Select>
    <Form.Control
      size="sm"
      type="number"
      min={0}
      step={1}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className="courses-table-filter-num"
      aria-label={label}
      placeholder="0"
      disabled={!operator}
      autoComplete="off"
    />
  </div>
)

const TableHeaderFilter = ({ label, value, onChange, children }) => (
  <Form.Select size="sm" value={value} onChange={(e) => onChange(e.target.value)} className="courses-table-filter" aria-label={label}>
    {children}
  </Form.Select>
)

const CoursesListTable = ({ courses, onRefresh, refreshing = false }) => {
  const { deleteCourse, restoreCourse, permanentlyDeleteCourse } = useGlobalContext()
  const [courseAction, setCourseAction] = useState(null)
  const [courseSearch, setCourseSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER)
  const [pricingFilter, setPricingFilter] = useState(ALL_FILTER)
  const [lessonsOperator, setLessonsOperator] = useState(ALL_FILTER)
  const [lessonsValue, setLessonsValue] = useState('')
  const [enrollmentsOperator, setEnrollmentsOperator] = useState(ALL_FILTER)
  const [enrollmentsValue, setEnrollmentsValue] = useState('')

  const hasActiveFilters =
    courseSearch.trim() ||
    statusFilter ||
    pricingFilter ||
    (lessonsOperator && lessonsValue !== '') ||
    (enrollmentsOperator && enrollmentsValue !== '')

  const clearFilters = useCallback(() => {
    setCourseSearch('')
    setStatusFilter(ALL_FILTER)
    setPricingFilter(ALL_FILTER)
    setLessonsOperator(ALL_FILTER)
    setLessonsValue('')
    setEnrollmentsOperator(ALL_FILTER)
    setEnrollmentsValue('')
  }, [])

  const handleLessonsOperatorChange = useCallback((operator) => {
    setLessonsOperator(operator)
    if (!operator) setLessonsValue('')
  }, [])

  const handleEnrollmentsOperatorChange = useCallback((operator) => {
    setEnrollmentsOperator(operator)
    if (!operator) setEnrollmentsValue('')
  }, [])

  const filteredCourses = useMemo(() => {
    return courses.filter(
      (course) =>
        matchesCourseSearch(course, courseSearch) &&
        matchesStatusFilter(course, statusFilter) &&
        matchesPricingFilter(course, pricingFilter) &&
        matchesCountFilter(course.lessonCount || 0, lessonsOperator, lessonsValue) &&
        matchesCountFilter(course.enrollmentCount || 0, enrollmentsOperator, enrollmentsValue),
    )
  }, [courses, courseSearch, statusFilter, pricingFilter, lessonsOperator, lessonsValue, enrollmentsOperator, enrollmentsValue])

  const isTableBusy = Boolean(courseAction) || refreshing

  const runCourseAction = useCallback(
    async ({ id, type, action, successTitle, successMessage, errorMessage }) => {
      setCourseAction({ id, type })
      try {
        await action(id)
        await onRefresh()
        await Swal.fire(successTitle, successMessage, 'success')
      } catch (error) {
        Swal.fire('Error', apiErrorMessage(error, errorMessage), 'error')
      } finally {
        setCourseAction(null)
      }
    },
    [onRefresh],
  )

  const handleRemove = useCallback(
    async (id, title) => {
      const result = await Swal.fire({
        title: 'Remove course from catalog?',
        html: `This will hide <strong>${title}</strong> from the public site and revoke student access. Curriculum data is kept for your records.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Remove',
        cancelButtonText: 'Cancel',
      })
      if (!result.isConfirmed) return

      await runCourseAction({
        id,
        type: COURSE_ACTION.REMOVE,
        action: deleteCourse,
        successTitle: 'Removed',
        successMessage: 'Course removed from catalog successfully.',
        errorMessage: 'Failed to remove course',
      })
    },
    [deleteCourse, runCourseAction],
  )

  const handleRestore = useCallback(
    async (id, title) => {
      const result = await Swal.fire({
        title: 'Restore course?',
        html: `Restore <strong>${title}</strong> to the admin dashboard. Publish it separately to make it public again. Previous enrollments stay revoked.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Restore',
        cancelButtonText: 'Cancel',
      })
      if (!result.isConfirmed) return

      await runCourseAction({
        id,
        type: COURSE_ACTION.RESTORE,
        action: restoreCourse,
        successTitle: 'Restored',
        successMessage: 'Course has been restored.',
        errorMessage: 'Failed to restore course',
      })
    },
    [restoreCourse, runCourseAction],
  )

  const handlePermanentDelete = useCallback(
    async (id, title) => {
      const result = await Swal.fire({
        title: 'Permanently delete course?',
        html: `Delete <strong>${title}</strong> forever? This removes all modules, lessons, videos, and files. This cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete permanently',
        confirmButtonColor: '#d33',
        cancelButtonText: 'Cancel',
      })
      if (!result.isConfirmed) return

      await runCourseAction({
        id,
        type: COURSE_ACTION.PERMANENT_DELETE,
        action: permanentlyDeleteCourse,
        successTitle: 'Deleted',
        successMessage: 'Course has been permanently deleted.',
        errorMessage: 'Permanent delete failed',
      })
    },
    [permanentlyDeleteCourse, runCourseAction],
  )

  const isCourseActioning = useCallback((courseId, type) => courseAction?.id === courseId && courseAction?.type === type, [courseAction])

  const columns = useMemo(
    () => [
      {
        id: 'course',
        header: () => (
          <div className="d-flex flex-column gap-1 courses-table-filters">
            <span className="fw-semibold">Course</span>
            <TableHeaderSearch label="Search courses" value={courseSearch} onChange={setCourseSearch} placeholder="Search title or slug..." />
          </div>
        ),
        meta: { className: 'courses-list-col-title' },
        cell: ({ row: { original: course } }) => {
          const deleted = isCourseDeleted(course)
          return (
            <div className={clsx('d-flex align-items-center gap-2', deleted && 'opacity-75')}>
              {course.thumbnailUrl && <img src={course.thumbnailUrl} alt="" width={48} height={36} className="rounded object-fit-cover" />}
              <div>
                <div className="fw-semibold">{course.title}</div>
                <small className="text-muted">/{course.slug}</small>
              </div>
            </div>
          )
        },
      },
      {
        id: 'status',
        header: () => (
          <div className="d-flex flex-column gap-1 courses-table-filters">
            <span className="fw-semibold">Status</span>
            <TableHeaderFilter label="Filter by status" value={statusFilter} onChange={setStatusFilter}>
              <option value={ALL_FILTER}>All statuses</option>
              <option value={COURSE_STATUS.DRAFT}>{COURSE_STATUS.DRAFT}</option>
              <option value={COURSE_STATUS.PUBLISHED}>{COURSE_STATUS.PUBLISHED}</option>
              <option value={COURSE_STATUS.ARCHIVED}>{COURSE_STATUS.ARCHIVED}</option>
              <option value={COURSE_STATUS.REMOVED}>{COURSE_STATUS.REMOVED}</option>
            </TableHeaderFilter>
          </div>
        ),
        cell: ({ row: { original: course } }) => {
          const deleted = isCourseDeleted(course)
          return (
            <div className="d-flex flex-column gap-1 align-items-start">
              {!deleted && <Badge bg={statusVariant(course.status)}>{course.status}</Badge>}
              {deleted && <Badge bg="danger">Removed</Badge>}
            </div>
          )
        },
      },
      {
        id: 'pricing',
        header: () => (
          <div className="d-flex flex-column gap-1 courses-table-filters">
            <span className="fw-semibold">Pricing</span>
            <TableHeaderFilter label="Filter by pricing" value={pricingFilter} onChange={setPricingFilter}>
              <option value={ALL_FILTER}>All pricing</option>
              <option value={PRICING_FILTER.FREE}>Free</option>
              <option value={PRICING_FILTER.PAID}>Paid</option>
              <option value={PRICING_FILTER.ON_SALE}>On sale</option>
              <option value={PRICING_FILTER.FREE_OFFER_EXPIRED}>Free offer expired</option>
              <option value={PRICING_FILTER.DISCOUNT_EXPIRED}>Discount expired</option>
            </TableHeaderFilter>
          </div>
        ),
        cell: ({ row: { original: course } }) => {
          const display = getPublicPriceDisplay(course.pricing)
          if (display.isFree && !display.compareAt) {
            return <Badge bg="info">Free</Badge>
          }
          if (display.compareAt != null) {
            return (
              <div className="d-flex flex-column">
                <span className="text-muted text-decoration-line-through small">{formatUsd(display.compareAt)}</span>
                <span className="fw-semibold text-success">{display.isFree ? 'Free' : display.primaryLabel}</span>
                {course.pricing?.freeOfferExpired && (
                  <Badge bg="warning" text="dark" className="mt-1 align-self-start">
                    Free offer expired
                  </Badge>
                )}
                {course.pricing?.discountExpired && (
                  <Badge bg="warning" text="dark" className="mt-1 align-self-start">
                    Discount expired
                  </Badge>
                )}
                {!course.pricing?.discountExpired && !course.pricing?.freeOfferExpired && display.expirationLabel && (
                  <small className="text-muted">{display.expirationLabel}</small>
                )}
              </div>
            )
          }
          return <span>{display.primaryLabel}</span>
        },
      },
      {
        id: 'lessons',
        header: () => (
          <div className="d-flex flex-column gap-1 courses-table-filters">
            <span className="fw-semibold">Lessons</span>
            <TableHeaderCountFilter
              label="Filter lessons count"
              operator={lessonsOperator}
              value={lessonsValue}
              onOperatorChange={handleLessonsOperatorChange}
              onValueChange={setLessonsValue}
            />
          </div>
        ),
        cell: ({ row: { original: course } }) => course.lessonCount || 0,
      },
      {
        id: 'enrollments',
        header: () => (
          <div className="d-flex flex-column gap-1 courses-table-filters">
            <span className="fw-semibold">Enrollments</span>
            <TableHeaderCountFilter
              label="Filter enrollments count"
              operator={enrollmentsOperator}
              value={enrollmentsValue}
              onOperatorChange={handleEnrollmentsOperatorChange}
              onValueChange={setEnrollmentsValue}
            />
          </div>
        ),
        cell: ({ row: { original: course } }) => course.enrollmentCount || 0,
      },
      {
        id: 'action',
        header: () => (
          <div className="d-flex flex-column gap-1 courses-table-filters">
            <span className="fw-semibold">Action</span>
            {hasActiveFilters ? (
              <Button variant="outline-secondary" size="sm" className="courses-table-filter-btn" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <span className="courses-table-filter-placeholder" aria-hidden="true">
                &nbsp;
              </span>
            )}
          </div>
        ),
        cell: ({ row: { original: course } }) => {
          const deleted = isCourseDeleted(course)
          return (
            <div className="d-flex gap-1 flex-wrap">
              {!deleted && (
                <>
                  <Link
                    to={`/ecommerce/courses/edit/${course._id}`}
                    className={clsx('btn btn-sm btn-soft-primary', isTableBusy && 'disabled pe-none opacity-50')}
                    title="Edit course"
                    aria-disabled={isTableBusy}
                    tabIndex={isTableBusy ? -1 : undefined}
                    onClick={(e) => {
                      if (isTableBusy) e.preventDefault()
                    }}>
                    <IconifyIcon icon="bx:edit" />
                  </Link>
                  <Button
                    variant="soft-danger"
                    size="sm"
                    title="Remove from catalog"
                    className={isCourseActioning(course._id, COURSE_ACTION.REMOVE) ? 'course-action-btn--loading' : ''}
                    disabled={isTableBusy}
                    onClick={() => handleRemove(course._id, course.title)}>
                    {isCourseActioning(course._id, COURSE_ACTION.REMOVE) ? <Spinner animation="border" size="sm" /> : <IconifyIcon icon="bx:trash" />}
                  </Button>
                </>
              )}
              {deleted && (
                <>
                  <Button
                    variant="soft-primary"
                    size="sm"
                    title="Restore course"
                    className={isCourseActioning(course._id, COURSE_ACTION.RESTORE) ? 'course-action-btn--loading' : ''}
                    disabled={isTableBusy}
                    onClick={() => handleRestore(course._id, course.title)}>
                    {isCourseActioning(course._id, COURSE_ACTION.RESTORE) ? <Spinner animation="border" size="sm" /> : <IconifyIcon icon="bx:undo" />}
                  </Button>
                  <Button
                    variant="soft-danger"
                    size="sm"
                    title="Delete permanently"
                    className={isCourseActioning(course._id, COURSE_ACTION.PERMANENT_DELETE) ? 'course-action-btn--loading' : ''}
                    disabled={isTableBusy}
                    onClick={() => handlePermanentDelete(course._id, course.title)}>
                    {isCourseActioning(course._id, COURSE_ACTION.PERMANENT_DELETE) ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <IconifyIcon icon="bx:x" />
                    )}
                  </Button>
                </>
              )}
            </div>
          )
        },
      },
    ],
    [
      courseSearch,
      statusFilter,
      pricingFilter,
      lessonsOperator,
      lessonsValue,
      enrollmentsOperator,
      enrollmentsValue,
      hasActiveFilters,
      clearFilters,
      handleLessonsOperatorChange,
      handleEnrollmentsOperatorChange,
      handleRemove,
      handleRestore,
      handlePermanentDelete,
      isCourseActioning,
      isTableBusy,
    ],
  )

  const pageSizeList = [5, 10, 20, 50]
  const isFilteredEmpty = filteredCourses.length === 0 && courses.length > 0
  const isFullyEmpty = courses.length === 0

  const emptyState =
    isFilteredEmpty || isFullyEmpty ? (
      <LmsListEmptyState preset="courses" variant={isFilteredEmpty ? 'filtered' : 'empty'} inTable onClearFilters={clearFilters} />
    ) : null

  return (
    <div className={clsx('courses-list-table-wrap', isTableBusy && 'courses-list-table-wrap--loading')}>
      {isTableBusy && (
        <div className="course-panel-loading" role="status" aria-live="polite">
          <Spinner animation="border" size="sm" />
          <span>{courseAction ? COURSE_ACTION_LABELS[courseAction.type] || 'Processing course…' : 'Refreshing courses…'}</span>
        </div>
      )}
      <ReactTable
        columns={columns}
        data={filteredCourses}
        rowsPerPageList={pageSizeList}
        pageSize={10}
        tableClass={clsx('text-nowrap mb-0 courses-list-table align-middle')}
        theadClass="bg-light bg-opacity-50"
        showPagination
        emptyState={emptyState}
      />
    </div>
  )
}

export default CoursesListTable
