import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, CardBody, Col, Form, Modal, Row } from 'react-bootstrap'
import { useSearchParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import { useGlobalContext } from '@/context/useGlobalContext'
import useConfirmAction from '@/hooks/useConfirmAction'

const FOCUS_DISMISS_MS = 450
const TABLE_PAGE_SIZE = 10

const UserRequestsPage = () => {
  const { getUserActionRequests, reviewUserActionRequest } = useGlobalContext()
  const confirmAction = useConfirmAction()
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightRequestId = searchParams.get('request')
  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('')
  const [reviewModal, setReviewModal] = useState(null)
  const [reviewNote, setReviewNote] = useState('')
  const [activeHighlightId, setActiveHighlightId] = useState(highlightRequestId)
  const [isDismissing, setIsDismissing] = useState(false)

  const clearHighlightFromUrl = useCallback(() => {
    if (!searchParams.has('request')) return
    const next = new URLSearchParams(searchParams)
    next.delete('request')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const load = useCallback(async () => {
    try {
      const data = await getUserActionRequests(filter ? { status: filter } : {})
      setRequests(data.requests || [])
    } catch (e) {
      console.error(e)
    }
  }, [getUserActionRequests, filter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (highlightRequestId) {
      setActiveHighlightId(highlightRequestId)
      setIsDismissing(false)
    }
  }, [highlightRequestId])

  useEffect(() => {
    if (!highlightRequestId || requests.length === 0) return
    const exists = requests.some((request) => String(request._id) === String(highlightRequestId))
    if (!exists && filter !== '') {
      setFilter('')
    }
  }, [highlightRequestId, requests, filter])

  const clearHighlight = useCallback(() => {
    if (!activeHighlightId || isDismissing) return
    clearHighlightFromUrl()
    setIsDismissing(true)
    window.setTimeout(() => {
      setActiveHighlightId(null)
      setIsDismissing(false)
    }, FOCUS_DISMISS_MS)
  }, [activeHighlightId, isDismissing, clearHighlightFromUrl])

  const initialPageIndex = useMemo(() => {
    if (!activeHighlightId || !requests.length) return 0
    const index = requests.findIndex((request) => String(request._id) === String(activeHighlightId))
    if (index < 0) return 0
    return Math.floor(index / TABLE_PAGE_SIZE)
  }, [activeHighlightId, requests])

  const handleReview = async (status) => {
    const actionLabel = status === 'approved' ? 'approve' : 'reject'
    await confirmAction({
      title: `${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} request?`,
      text: `This will ${actionLabel} the Editor's user management request.`,
      confirmLabel: actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1),
      variant: status === 'approved' ? 'primary' : 'danger',
      onConfirm: async () => {
        try {
          await reviewUserActionRequest(reviewModal._id, { status, reviewNote })
          setReviewModal(null)
          setReviewNote('')
          clearHighlight()
          await Swal.fire('Done', `Request ${status}.`, 'success')
          load()
        } catch (e) {
          Swal.fire('Error', e?.response?.data?.message || 'Review failed', 'error')
        }
      },
    })
  }

  const columns = [
    {
      header: 'Action',
      cell: ({ row: { original: r } }) => <Badge bg="secondary">{r.action}</Badge>,
    },
    {
      header: 'Target user',
      cell: ({ row: { original: r } }) => r.targetUserId?.username || '—',
    },
    {
      header: 'Requested by',
      cell: ({ row: { original: r } }) => (r.requestedBy ? `${r.requestedBy.firstname} ${r.requestedBy.lastname}` : '—'),
    },
    {
      header: 'Status',
      cell: ({ row: { original: r } }) => (
        <Badge bg={r.status === 'pending' ? 'warning' : r.status === 'approved' ? 'success' : 'danger'}>{r.status}</Badge>
      ),
    },
    {
      header: 'Review',
      cell: ({ row: { original: r } }) => {
        const isFocusedRequest = activeHighlightId && String(r._id) === String(activeHighlightId)
        return r.status === 'pending' ? (
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              if (isFocusedRequest) clearHighlight()
              setReviewModal(r)
            }}>
            Review
          </Button>
        ) : (
          <span className="text-muted small">{r.reviewNote || '—'}</span>
        )
      },
    },
  ]

  return (
    <>
      <PageMetaData title="User Requests" />
      <PageBreadcrumb title="User Requests" subName="Administration" />
      <Row className="mb-3">
        <Col md={4}>
          <Form.Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="">All</option>
          </Form.Select>
        </Col>
      </Row>
      <Row>
        <Col>
          <Card>
            <CardBody>
              <ReactTable
                key={`${filter}-${requests.length}-${activeHighlightId || 'none'}`}
                columns={columns}
                data={requests}
                pageSize={TABLE_PAGE_SIZE}
                showPagination
                tableClass="mb-0"
                initialPageIndex={initialPageIndex}
                getRowDomId={(request) => request._id}
                rowDomIdPrefix="request-row-"
                highlightedRowId={activeHighlightId}
                highlightDismissing={isDismissing}
                getRowClassName={(_, { isHighlighted, isDismissing: dismissing }) =>
                  clsx(isHighlighted && 'project-row-focus', isHighlighted && dismissing && 'project-row-focus--dismissing')
                }
              />
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Modal show={!!reviewModal} onHide={() => setReviewModal(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Review request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            <strong>Action:</strong> {reviewModal?.action}
          </p>
          <p>
            <strong>User:</strong> {reviewModal?.targetUserId?.username}
          </p>
          {reviewModal?.action === 'update' && reviewModal?.payload && (
            <pre className="bg-light p-2 small">{JSON.stringify(reviewModal.payload, null, 2)}</pre>
          )}
          <Form.Group>
            <Form.Label>Note (optional)</Form.Label>
            <Form.Control as="textarea" rows={2} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-danger" onClick={() => handleReview('rejected')}>
            Reject
          </Button>
          <Button variant="success" onClick={() => handleReview('approved')}>
            Approve
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default UserRequestsPage
