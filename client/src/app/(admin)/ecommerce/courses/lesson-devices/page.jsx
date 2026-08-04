import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { Badge, Button, Card, CardBody, Col, Form, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import ProjectsListTableSkeleton from '@/components/skeletons/ProjectsListTableSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import useFetchList from '@/hooks/useFetchList'
import LmsSectionNav from '../components/LmsSectionNav'
import LessonDeviceManageModal from '../components/LessonDeviceManageModal'

const TABLE_PAGE_SIZE = 10
const FOCUS_DISMISS_MS = 4500

const formatDateTime = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

const getStudentLabel = (device) => {
  const user = device?.user
  if (!user) return 'Student'
  const name = [user.firstname, user.lastname].filter(Boolean).join(' ')
  return name || user.username || user.email || 'Student'
}

const LessonDevicesPage = () => {
  const { getAllLessonDevices } = useGlobalContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const deepLinkHandled = useRef(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 50 })
  const [manageUser, setManageUser] = useState(null)
  const [highlightUserId, setHighlightUserId] = useState(null)
  const [highlightDismissing, setHighlightDismissing] = useState(false)
  const [openDeviceOnLoad, setOpenDeviceOnLoad] = useState(false)

  useEffect(() => {
    if (deepLinkHandled.current) return

    const userId = searchParams.get('userId') || searchParams.get('studentId') || ''
    const shouldOpen = searchParams.get('openDevice') === '1' || searchParams.get('openDevice') === 'true'

    if (!userId) return

    deepLinkHandled.current = true
    setHighlightUserId(userId)
    setOpenDeviceOnLoad(shouldOpen)

    const next = new URLSearchParams(searchParams)
    next.delete('userId')
    next.delete('studentId')
    next.delete('openDevice')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const fetchDevices = useCallback(async () => {
    const response = await getAllLessonDevices({
      page,
      limit: 50,
      search: search || undefined,
      ...(highlightUserId && !search ? { userId: highlightUserId } : {}),
    })
    setPagination(response.pagination || { total: 0, totalPages: 1, limit: 50 })
    return response.devices || []
  }, [getAllLessonDevices, highlightUserId, page, search])

  const { items: devices, loading, refresh } = useFetchList(fetchDevices)

  useEffect(() => {
    if (!openDeviceOnLoad || !highlightUserId || loading) return

    const device = devices.find((item) => String(item.userId) === String(highlightUserId))
    setManageUser({
      userId: highlightUserId,
      label: device ? getStudentLabel(device) : 'Student',
    })
    setOpenDeviceOnLoad(false)
  }, [devices, highlightUserId, loading, openDeviceOnLoad])

  useEffect(() => {
    if (!highlightUserId || highlightDismissing) return

    const timer = window.setTimeout(() => {
      setHighlightDismissing(true)
      window.setTimeout(() => {
        setHighlightUserId(null)
        setHighlightDismissing(false)
      }, 450)
    }, FOCUS_DISMISS_MS)

    return () => window.clearTimeout(timer)
  }, [highlightDismissing, highlightUserId])

  const initialPageIndex = useMemo(() => {
    if (!highlightUserId || !devices.length) return undefined
    const index = devices.findIndex((device) => String(device.userId) === String(highlightUserId))
    if (index < 0) return undefined
    return Math.floor(index / TABLE_PAGE_SIZE)
  }, [devices, highlightUserId])

  const columns = useMemo(
    () => [
      {
        id: 'student',
        header: 'Student',
        cell: ({ row: { original: device } }) => (
          <>
            {getStudentLabel(device)}
            <br />
            <small>{device.user?.email}</small>
          </>
        ),
      },
      {
        id: 'device',
        header: 'Device',
        cell: ({ row: { original: device } }) => device.deviceLabel || 'Unknown device',
      },
      {
        id: 'ip',
        header: 'IP fingerprint',
        cell: ({ row: { original: device } }) => (device.ipHashShort ? <span className="font-monospace small">{device.ipHashShort}…</span> : '—'),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row: { original: device } }) => <Badge bg={device.status === 'blocked' ? 'danger' : 'success'}>{device.status}</Badge>,
      },
      {
        id: 'registered',
        header: 'Registered',
        cell: ({ row: { original: device } }) => formatDateTime(device.registeredAt),
      },
      {
        id: 'lastSeen',
        header: 'Last seen',
        cell: ({ row: { original: device } }) => formatDateTime(device.lastSeenAt),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row: { original: device } }) => (
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() =>
              setManageUser({
                userId: device.userId,
                label: getStudentLabel(device),
              })
            }>
            Manage
          </Button>
        ),
      },
    ],
    [],
  )

  const handleSearch = (event) => {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const emptyState = (
    <div className="text-center py-4 text-muted">
      <p className="mb-1 fw-semibold">No lesson devices yet</p>
      <p className="mb-0 small">Devices appear here after students open an enrolled lesson.</p>
    </div>
  )

  return (
    <>
      <PageMetaData title="Lesson Devices" />
      <PageBreadcrumb title="Lesson Devices" subName="LMS" />
      <Row className="mb-3">
        <Col>
          <div className="courses-page-toolbar">
            <LmsSectionNav />
            <Form onSubmit={handleSearch} className="d-flex gap-2 ms-md-auto" style={{ minWidth: 'min(100%, 22rem)' }}>
              <Form.Control
                placeholder="Search by name, username, or email"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
              <Button type="submit" variant="outline-secondary">
                Search
              </Button>
            </Form>
          </div>
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
                    key={`${search}-${highlightUserId || 'none'}-${devices.length}`}
                    columns={columns}
                    data={devices}
                    rowsPerPageList={[10, 20, 50]}
                    pageSize={TABLE_PAGE_SIZE}
                    initialPageIndex={initialPageIndex}
                    getRowDomId={(device) => device.userId}
                    rowDomIdPrefix="lesson-device-row-"
                    highlightedRowId={highlightUserId}
                    highlightDismissing={highlightDismissing}
                    getRowClassName={(_device, { isHighlighted, isDismissing }) =>
                      clsx(isHighlighted && 'project-row-focus', isHighlighted && isDismissing && 'project-row-focus--dismissing')
                    }
                    tableClass="text-nowrap mb-0 align-middle"
                    theadClass="bg-light bg-opacity-50"
                    showPagination={devices.length > 0}
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

      <LessonDeviceManageModal
        show={Boolean(manageUser)}
        userId={manageUser?.userId}
        userLabel={manageUser?.label}
        onHide={() => setManageUser(null)}
        onUpdated={refresh}
      />
    </>
  )
}

export default LessonDevicesPage
