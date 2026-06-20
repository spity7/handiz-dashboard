import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { Alert, Badge, Button, Card, CardBody, Col, Form, Modal, Row } from 'react-bootstrap'
import Swal from 'sweetalert2'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import { useAuthContext } from '@/context/useAuthContext'
import { useGlobalContext } from '@/context/useGlobalContext'
import useConfirmAction from '@/hooks/useConfirmAction'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { ROLES } from '@/constants/roles'

const sameId = (a, b) => a != null && b != null && String(a) === String(b)

const isDeletedAccount = (user) => Boolean(user?.deletedAt)

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

const UserProjectCountCell = ({ user }) => {
  const count = user.projectCount ?? 0
  const projectsLabel = count === 1 ? '1 project' : `${count} projects`

  if (count === 0) {
    return (
      <span className="users-table-project-count users-table-project-count--empty" title="No student projects">
        <IconifyIcon icon="bx:folder" className="users-table-project-count__icon" aria-hidden />
        <span className="users-table-project-count__label">None</span>
      </span>
    )
  }

  return (
    <Link
      to={`/ecommerce/student-projects?owner=${user._id}`}
      className={clsx('users-table-project-count', isDeletedAccount(user) && 'users-table-project-count--deleted-owner')}
      title={`View ${projectsLabel} by ${user.username}`}
      aria-label={`View ${projectsLabel} by ${user.username}`}>
      <IconifyIcon icon="bx:folder-open" className="users-table-project-count__icon" aria-hidden />
      <span className="users-table-project-count__value">{count}</span>
      <IconifyIcon icon="bx:chevron-right" className="users-table-project-count__arrow" aria-hidden />
    </Link>
  )
}

const UsersPage = () => {
  const { user: currentUser } = useAuthContext()
  const { getEmployees, updateEmployee, deleteEmployee, restoreEmployee } = useGlobalContext()
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

  const handleRestore = async (emp) => {
    await confirmAction({
      title: 'Restore account?',
      text: `Restore ${emp.username}? They will be able to sign in again.`,
      confirmLabel: 'Restore Account',
      variant: 'success',
      icon: 'question',
      onConfirm: async () => {
        try {
          await restoreEmployee(emp._id)
          setEditUser(null)
          await Swal.fire('Restored', 'Account has been restored.', 'success')
          load()
        } catch (e) {
          Swal.fire('Error', e?.response?.data?.error || 'Restore failed', 'error')
        }
      },
    })
  }

  const handleDelete = async (emp) => {
    await confirmAction({
      title: 'Delete account?',
      text: `Soft-delete ${emp.username}? Their student projects will stay linked to this account.`,
      confirmLabel: 'Delete Account',
      variant: 'danger',
      icon: 'warning',
      onConfirm: async () => {
        try {
          await deleteEmployee(emp._id)
          await Swal.fire('Deleted', 'Account has been soft-deleted.', 'success')
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
          const deleted = isDeletedAccount(e)
          return (
            <div className="d-flex align-items-center gap-2">
              <span className={clsx('users-table-avatar', isYou && 'users-table-avatar--current', deleted && 'users-table-avatar--deleted')}>
                {getInitials(e.firstname, e.lastname)}
              </span>
              <div className="min-w-0">
                <div className="fw-medium text-truncate">
                  {e.firstname} {e.lastname}
                  {isYou && (
                    <Badge bg="primary" className="ms-2 users-table-you-badge">
                      You
                    </Badge>
                  )}
                  {deleted && (
                    <Badge bg="danger" className="ms-2 users-table-deleted-badge">
                      Deleted
                    </Badge>
                  )}
                </div>
                {isYou && <div className="text-muted small">Your signed-in account</div>}
                {deleted && !isYou && <div className="text-muted small">Soft-deleted account</div>}
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
        header: 'Projects',
        cell: ({ row: { original: e } }) => <UserProjectCountCell user={e} />,
      },
      {
        header: 'Actions',
        cell: ({ row: { original: e } }) => {
          const isYou = isCurrentAccount(e)
          const deleted = isDeletedAccount(e)
          const isViewOnly = isYou || deleted
          return (
            <Button
              size="sm"
              variant="soft-primary"
              className={clsx(
                'users-table-action-btn',
                isYou && 'users-table-action-btn--current',
                deleted && 'users-table-action-btn--deleted',
                !isViewOnly && 'users-table-action-btn--manage',
              )}
              onClick={() => openEdit(e)}>
              {isViewOnly ? 'View account' : 'Manage role'}
            </Button>
          )
        },
      },
    ],
    [isCurrentAccount],
  )

  const isEditingSelf = editUser && isCurrentAccount(editUser)
  const isAdminAccount = editUser?.role === ROLES.ADMIN
  const isDeletedUser = editUser && isDeletedAccount(editUser)
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
                    getRowClassName={(emp) => {
                      if (isCurrentAccount(emp)) return 'users-table-current-row'
                      if (isDeletedAccount(emp)) return 'users-table-deleted-row'
                      return undefined
                    }}
                  />
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Modal show={!!editUser} onHide={() => setEditUser(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{isDeletedUser ? 'Deleted account' : isEditingSelf ? 'Your account' : 'Manage user role'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isDeletedUser && (
            <Alert variant="danger" className="users-table-account-alert mb-4">
              <strong className="d-block mb-1">This account has been deleted</strong>
              <span className="small mb-0">
                The user cannot sign in until the account is restored. Their student projects remain linked to this account.
              </span>
            </Alert>
          )}
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
                  <Form.Select value={role} disabled={isAdminAccount || isEditingSelf || isDeletedUser} onChange={(ev) => setRole(ev.target.value)}>
                    <option value={ROLES.USER}>User</option>
                    <option value={ROLES.EDITOR}>Editor</option>
                    <option value={ROLES.ADMIN}>Admin</option>
                  </Form.Select>
                  {isAdminAccount && !isEditingSelf && <Form.Text className="text-muted">Admin role cannot be changed.</Form.Text>}
                  {isEditingSelf && !isDeletedUser && <Form.Text className="text-muted">Your role is managed by another Admin.</Form.Text>}
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
          ) : isDeletedUser ? (
            <>
              <Button variant="secondary" onClick={() => setEditUser(null)}>
                Close
              </Button>
              <Button variant="success" onClick={() => handleRestore(editUser)}>
                Restore account
              </Button>
            </>
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
