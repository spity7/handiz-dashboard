import { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { Alert, Badge, Button, Card, CardBody, Col, Form, Modal, Row } from 'react-bootstrap'
import Swal from 'sweetalert2'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import { useAuthContext } from '@/context/useAuthContext'
import { useGlobalContext } from '@/context/useGlobalContext'
import useConfirmAction from '@/hooks/useConfirmAction'
import { ROLES } from '@/constants/roles'

const sameId = (a, b) => a != null && b != null && String(a) === String(b)

const getInitials = (firstname = '', lastname = '') => `${firstname.charAt(0)}${lastname.charAt(0)}`.toUpperCase() || '?'

const roleBadgeVariant = (role) => {
  switch (role) {
    case ROLES.ADMIN:
      return 'primary'
    case ROLES.EDITOR:
      return 'warning'
    default:
      return 'secondary'
  }
}

const UsersPage = () => {
  const { user: currentUser } = useAuthContext()
  const { getEmployees, updateEmployee, deleteEmployee } = useGlobalContext()
  const confirmAction = useConfirmAction()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState(null)
  const [role, setRole] = useState(ROLES.USER)

  const currentUserId = currentUser?._id

  const isCurrentAccount = useCallback((emp) => sameId(emp?._id, currentUserId), [currentUserId])

  const sortedEmployees = useMemo(() => {
    if (!currentUserId || !employees.length) return employees
    const current = employees.find((emp) => sameId(emp._id, currentUserId))
    if (!current) return employees
    return [current, ...employees.filter((emp) => !sameId(emp._id, currentUserId))]
  }, [employees, currentUserId])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getEmployees({ limit: 100 })
      setEmployees(data.employees || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [getEmployees])

  useEffect(() => {
    load()
  }, [load])

  const openEdit = (emp) => {
    setEditUser(emp)
    setRole(emp.role)
  }

  const handleSaveRole = async () => {
    await confirmAction({
      title: 'Save role change?',
      text: `Update role for ${editUser.username}?`,
      confirmLabel: 'Save',
      onConfirm: async () => {
        try {
          await updateEmployee(editUser._id, { role })
          setEditUser(null)
          await Swal.fire('Saved', 'User role updated successfully.', 'success')
          load()
        } catch (e) {
          Swal.fire('Error', e?.response?.data?.error || 'Update failed', 'error')
        }
      },
    })
  }

  const handleDelete = async (emp) => {
    await confirmAction({
      title: 'Delete account?',
      text: `Permanently delete ${emp.username}?`,
      confirmLabel: 'Delete Account',
      variant: 'danger',
      icon: 'warning',
      onConfirm: async () => {
        try {
          await deleteEmployee(emp._id)
          await Swal.fire('Deleted', 'User removed.', 'success')
          load()
        } catch (e) {
          Swal.fire('Error', e?.response?.data?.error || 'Delete failed', 'error')
        }
      },
    })
  }

  const columns = useMemo(
    () => [
      {
        header: 'Name',
        cell: ({ row: { original: e } }) => {
          const isYou = isCurrentAccount(e)
          return (
            <div className="d-flex align-items-center gap-2">
              <span className={clsx('users-table-avatar', isYou && 'users-table-avatar--current')}>{getInitials(e.firstname, e.lastname)}</span>
              <div className="min-w-0">
                <div className="fw-medium text-truncate">
                  {e.firstname} {e.lastname}
                  {isYou && (
                    <Badge bg="primary" className="ms-2 users-table-you-badge">
                      You
                    </Badge>
                  )}
                </div>
                {isYou && <div className="text-muted small">Your signed-in account</div>}
              </div>
            </div>
          )
        },
      },
      {
        header: 'Username',
        cell: ({ row: { original: e } }) => <span className={clsx(isCurrentAccount(e) && 'fw-medium')}>{e.username}</span>,
      },
      { header: 'Email', cell: ({ row: { original: e } }) => e.email },
      {
        header: 'Role',
        cell: ({ row: { original: e } }) => <Badge bg={roleBadgeVariant(e.role)}>{e.role}</Badge>,
      },
      {
        header: 'Actions',
        cell: ({ row: { original: e } }) => {
          const isYou = isCurrentAccount(e)
          return (
            <Button size="sm" variant={isYou ? 'soft-secondary' : 'soft-primary'} onClick={() => openEdit(e)}>
              {isYou ? 'View account' : 'Manage role'}
            </Button>
          )
        },
      },
    ],
    [isCurrentAccount],
  )

  const isEditingSelf = editUser && isCurrentAccount(editUser)
  const isAdminAccount = editUser?.role === ROLES.ADMIN
  const roleUnchanged = editUser && role === editUser.role

  return (
    <>
      <PageMetaData title="Users" />
      <PageBreadcrumb title="Users" subName="Administration" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              {loading ? (
                <p className="text-muted">Loading...</p>
              ) : (
                <>
                  {currentUserId && sortedEmployees.some((emp) => isCurrentAccount(emp)) && (
                    <p className="text-muted small mb-3">Your account is pinned to the top of the list for quick reference.</p>
                  )}
                  <ReactTable
                    columns={columns}
                    data={sortedEmployees}
                    pageSize={10}
                    showPagination
                    tableClass="mb-0 users-table"
                    theadClass="bg-light bg-opacity-50"
                    getRowDomId={(emp) => emp._id}
                    rowDomIdPrefix="user-row-"
                    getRowClassName={(emp) => (isCurrentAccount(emp) ? 'users-table-current-row' : undefined)}
                  />
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Modal show={!!editUser} onHide={() => setEditUser(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{isEditingSelf ? 'Your account' : 'Manage user role'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isEditingSelf && (
            <Alert variant="primary" className="users-table-account-alert mb-4">
              <div className="d-flex align-items-start gap-3">
                <span className={clsx('users-table-avatar users-table-avatar--current mt-1')}>
                  {getInitials(editUser?.firstname, editUser?.lastname)}
                </span>
                <div>
                  <strong className="d-block mb-1">Signed in as {editUser?.username}</strong>
                  <span className="small mb-0">This is your account. You cannot change your own role or delete yourself from here.</span>
                </div>
              </div>
            </Alert>
          )}
          <Form>
            <Row className="g-3">
              <Col sm={6}>
                <Form.Group>
                  <Form.Label>First name</Form.Label>
                  <Form.Control value={editUser?.firstname ?? ''} readOnly plaintext={isEditingSelf} />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group>
                  <Form.Label>Last name</Form.Label>
                  <Form.Control value={editUser?.lastname ?? ''} readOnly plaintext={isEditingSelf} />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group>
                  <Form.Label>Username</Form.Label>
                  <Form.Control value={editUser?.username ?? ''} readOnly plaintext={isEditingSelf} />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group>
                  <Form.Label>Email</Form.Label>
                  <Form.Control value={editUser?.email ?? ''} readOnly plaintext={isEditingSelf} />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Role</Form.Label>
                  <Form.Select value={role} disabled={isAdminAccount || isEditingSelf} onChange={(ev) => setRole(ev.target.value)}>
                    <option value={ROLES.USER}>User</option>
                    <option value={ROLES.EDITOR}>Editor</option>
                    <option value={ROLES.ADMIN}>Admin</option>
                  </Form.Select>
                  {isAdminAccount && !isEditingSelf && <Form.Text className="text-muted">Admin role cannot be changed.</Form.Text>}
                  {isEditingSelf && <Form.Text className="text-muted">Your role is managed by another Admin.</Form.Text>}
                </Form.Group>
              </Col>
            </Row>
            {isAdminAccount && !isEditingSelf && <p className="text-muted small mb-0 mt-3">Admin accounts cannot be deleted.</p>}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          {isEditingSelf ? (
            <Button variant="secondary" onClick={() => setEditUser(null)}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="danger" onClick={() => handleDelete(editUser)} disabled={isAdminAccount}>
                Delete account
              </Button>
              <Button variant="primary" onClick={handleSaveRole} disabled={isAdminAccount || roleUnchanged}>
                Save role
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default UsersPage
