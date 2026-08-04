import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Col, Form, Modal, Row, Table } from 'react-bootstrap'
import Swal from 'sweetalert2'
import { useGlobalContext } from '@/context/useGlobalContext'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const formatDateTime = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

const formatAdminName = (admin) => {
  if (!admin) return '—'
  const name = [admin.firstname, admin.lastname].filter(Boolean).join(' ')
  return name || admin.username || admin.email || 'Admin'
}

const EVENT_LABELS = {
  registered: { label: 'Device registered', variant: 'success' },
  access_denied_conflict: { label: 'Wrong device blocked', variant: 'warning' },
  access_denied_blocked: { label: 'Access denied (blocked)', variant: 'danger' },
  reset: { label: 'Device reset', variant: 'secondary' },
  blocked: { label: 'Lesson access blocked', variant: 'danger' },
  unblocked: { label: 'Lesson access restored', variant: 'success' },
  revoked_password: { label: 'Cleared (password change)', variant: 'info' },
}

const getEventMeta = (action) => EVENT_LABELS[action] || { label: action, variant: 'secondary' }

const DetailItem = ({ label, value, mono = false }) => (
  <div className="lesson-device-detail-item">
    <span className="lesson-device-detail-item__label">{label}</span>
    <span className={`lesson-device-detail-item__value${mono ? ' lesson-device-detail-item__value--mono' : ''}`}>{value || '—'}</span>
  </div>
)

const LessonDeviceManageModal = ({ show, onHide, userId, userLabel, onUpdated }) => {
  const { getUserLessonDevice, resetUserLessonDevice, blockUserLessonDevice, unblockUserLessonDevice } = useGlobalContext()
  const [loading, setLoading] = useState(false)
  const [device, setDevice] = useState(null)
  const [events, setEvents] = useState([])
  const [blockReason, setBlockReason] = useState('')
  const [actionLoading, setActionLoading] = useState('')

  const loadDevice = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const response = await getUserLessonDevice(userId)
      setDevice(response.device || null)
      setEvents(response.events || [])
    } catch (error) {
      Swal.fire('Error', error?.response?.data?.message || 'Could not load lesson device.', 'error')
      setDevice(null)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [getUserLessonDevice, userId])

  useEffect(() => {
    if (!show || !userId) return
    setBlockReason('')
    loadDevice()
  }, [show, userId, loadDevice])

  const handleReset = async () => {
    const result = await Swal.fire({
      title: 'Reset lesson device?',
      text: 'The user can register a new device on their next lesson visit.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Reset device',
      confirmButtonColor: '#dc3545',
    })
    if (!result.isConfirmed) return

    setActionLoading('reset')
    try {
      await resetUserLessonDevice(userId)
      onUpdated?.()
      onHide()
      Swal.fire('Reset', 'Lesson device registration cleared.', 'success')
    } catch (error) {
      Swal.fire('Error', error?.response?.data?.message || 'Could not reset lesson device.', 'error')
    } finally {
      setActionLoading('')
    }
  }

  const handleBlock = async () => {
    setActionLoading('block')
    try {
      await blockUserLessonDevice(userId, blockReason)
      onUpdated?.()
      onHide()
      Swal.fire('Blocked', 'Lesson access has been suspended for this user.', 'success')
    } catch (error) {
      Swal.fire('Error', error?.response?.data?.message || 'Could not block lesson access.', 'error')
    } finally {
      setActionLoading('')
    }
  }

  const handleUnblock = async () => {
    setActionLoading('unblock')
    try {
      await unblockUserLessonDevice(userId)
      onUpdated?.()
      onHide()
      Swal.fire('Unblocked', 'Lesson access restored for this user.', 'success')
    } catch (error) {
      Swal.fire('Error', error?.response?.data?.message || 'Could not unblock lesson access.', 'error')
    } finally {
      setActionLoading('')
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered size="xl" scrollable className="lesson-device-manage-modal">
      <Modal.Header closeButton>
        <Modal.Title>Lesson device — {userLabel || 'Student'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <p className="text-muted mb-0">Loading device details…</p>
        ) : (
          <>
            <section className="lesson-device-section">
              <h6 className="lesson-device-section__title">
                <IconifyIcon icon="bx:laptop" className="me-1" />
                Current registration
              </h6>
              {!device ? (
                <p className="text-muted mb-0">No lesson device registered yet. The first lesson visit will register a device.</p>
              ) : (
                <div className="lesson-device-details card border-0 bg-light bg-opacity-50">
                  <div className="card-body">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <strong>Status</strong>
                      <Badge bg={device.status === 'blocked' ? 'danger' : 'success'}>{device.status}</Badge>
                    </div>
                    <Row className="g-3">
                      <Col md={6}>
                        <DetailItem label="Device" value={device.deviceLabel} />
                      </Col>
                      <Col md={6}>
                        <DetailItem label="Session ID" value={device.sessionId} mono />
                      </Col>
                      <Col md={6}>
                        <DetailItem label="Registered" value={formatDateTime(device.registeredAt)} />
                      </Col>
                      <Col md={6}>
                        <DetailItem label="Last seen" value={formatDateTime(device.lastSeenAt)} />
                      </Col>
                      <Col md={6}>
                        <DetailItem label="IP fingerprint" value={device.ipHashShort ? `${device.ipHashShort}…` : '—'} mono />
                      </Col>
                      <Col md={6}>
                        <DetailItem label="Blocked at" value={formatDateTime(device.blockedAt)} />
                      </Col>
                      <Col md={6}>
                        <DetailItem label="Blocked by" value={formatAdminName(device.blockedByUser)} />
                      </Col>
                      <Col md={6}>
                        <DetailItem label="Block reason" value={device.blockReason} />
                      </Col>
                      <Col xs={12}>
                        <DetailItem label="User agent" value={device.userAgent} mono />
                      </Col>
                    </Row>
                  </div>
                </div>
              )}
            </section>

            <section className="lesson-device-section mt-4">
              <h6 className="lesson-device-section__title">
                <IconifyIcon icon="bx:history" className="me-1" />
                Audit log
                {events.length > 0 ? (
                  <Badge bg="secondary" className="ms-2">
                    {events.length}
                  </Badge>
                ) : null}
              </h6>
              {events.length === 0 ? (
                <p className="text-muted mb-0">No device events recorded yet.</p>
              ) : (
                <div className="table-responsive lesson-device-audit-table-wrap">
                  <Table hover size="sm" className="lesson-device-audit-table mb-0 align-middle">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Event</th>
                        <th>Device</th>
                        <th>Registered device</th>
                        <th>IP fingerprint</th>
                        <th>By</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event) => {
                        const meta = getEventMeta(event.action)
                        return (
                          <tr key={event._id}>
                            <td className="text-nowrap">{formatDateTime(event.createdAt)}</td>
                            <td>
                              <Badge bg={meta.variant}>{meta.label}</Badge>
                            </td>
                            <td>{event.deviceLabel || '—'}</td>
                            <td>{event.registeredDeviceLabel || '—'}</td>
                            <td className="font-monospace small">{event.ipHashShort ? `${event.ipHashShort}…` : '—'}</td>
                            <td className="text-nowrap">{formatAdminName(event.admin)}</td>
                            <td className="small text-muted">
                              {event.reason ? <div>Reason: {event.reason}</div> : null}
                              {event.requestPath ? (
                                <div className="text-truncate" style={{ maxWidth: '14rem' }} title={event.requestPath}>
                                  Path: {event.requestPath}
                                </div>
                              ) : null}
                              {event.userAgent ? (
                                <div className="text-truncate" style={{ maxWidth: '14rem' }} title={event.userAgent}>
                                  UA: {event.userAgent}
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
            </section>

            <hr className="my-4" />

            <Form.Group>
              <Form.Label>Block reason (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={blockReason}
                onChange={(event) => setBlockReason(event.target.value)}
                placeholder="Shown internally for support reference"
              />
            </Form.Group>
          </>
        )}
      </Modal.Body>
      <Modal.Footer className="flex-wrap gap-2">
        <Button variant="light" onClick={onHide}>
          Close
        </Button>
        <Button variant="outline-danger" disabled={!device || actionLoading} onClick={handleReset}>
          {actionLoading === 'reset' ? 'Resetting…' : 'Reset device'}
        </Button>
        {device?.status === 'blocked' ? (
          <Button variant="outline-success" disabled={actionLoading} onClick={handleUnblock}>
            {actionLoading === 'unblock' ? 'Unblocking…' : 'Unblock access'}
          </Button>
        ) : (
          <Button variant="danger" disabled={actionLoading} onClick={handleBlock}>
            {actionLoading === 'block' ? 'Blocking…' : 'Block lesson access'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  )
}

export default LessonDeviceManageModal
