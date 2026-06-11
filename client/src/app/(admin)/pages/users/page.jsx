import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, CardBody, Col, Form, Modal, Row } from 'react-bootstrap'
import Swal from 'sweetalert2'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import { useGlobalContext } from '@/context/useGlobalContext'
import { useAuthContext } from '@/context/useAuthContext'
import useConfirmAction from '@/hooks/useConfirmAction'
import { canManageUsersDirect, ROLES } from '@/constants/roles'

const UsersPage = () => {
  const { user } = useAuthContext()
  const { getEmployees, updateEmployee, deleteEmployee, createUserActionRequest } = useGlobalContext()
  const confirmAction = useConfirmAction()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState({ firstname: '', lastname: '', username: '', role: ROLES.USER })

  const isAdmin = canManageUsersDirect(user)

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
    setForm({
      firstname: emp.firstname,
      lastname: emp.lastname,
      username: emp.username,
      role: emp.role,
    })
  }

  const handleAdminSave = async () => {
    await confirmAction({
      title: 'Save user changes?',
      text: `Update ${editUser.username}?`,
      confirmLabel: 'Save',
      onConfirm: async () => {
        try {
          await updateEmployee(editUser._id, form)
          setEditUser(null)
          await Swal.fire('Saved', 'User updated successfully.', 'success')
          load()
        } catch (e) {
          Swal.fire('Error', e?.response?.data?.error || 'Update failed', 'error')
        }
      },
    })
  }

  const handleAdminDelete = async (emp) => {
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

  const handleEditorRequest = async (action) => {
    const label = action === 'delete' ? 'request deletion of' : 'request changes for'
    await confirmAction({
      title: 'Submit for Admin approval?',
      text: `This will ${label} ${editUser.username}. An Admin must approve before it takes effect.`,
      confirmLabel: 'Submit request',
      onConfirm: async () => {
        try {
          await createUserActionRequest({
            action,
            targetUserId: editUser._id,
            payload: action === 'update' ? form : {},
          })
          setEditUser(null)
          await Swal.fire('Submitted', 'Your request was sent to Admin for review.', 'success')
        } catch (e) {
          Swal.fire('Error', e?.response?.data?.message || 'Request failed', 'error')
        }
      },
    })
  }

  const columns = [
    {
      header: 'Name',
      cell: ({ row: { original: e } }) => `${e.firstname} ${e.lastname}`,
    },
    { header: 'Username', cell: ({ row: { original: e } }) => e.username },
    { header: 'Email', cell: ({ row: { original: e } }) => e.email },
    {
      header: 'Role',
      cell: ({ row: { original: e } }) => <Badge bg="info">{e.role}</Badge>,
    },
    {
      header: 'Actions',
      cell: ({ row: { original: e } }) => (
        <Button size="sm" variant="soft-primary" onClick={() => openEdit(e)}>
          {isAdmin ? 'Manage' : 'View / Request'}
        </Button>
      ),
    },
  ]

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
                <ReactTable columns={columns} data={employees} pageSize={10} showPagination tableClass="mb-0" />
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Modal show={!!editUser} onHide={() => setEditUser(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{isAdmin ? 'Manage user' : 'User details'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>First name</Form.Label>
              <Form.Control
                value={form.firstname}
                readOnly={!isAdmin && user?.role !== ROLES.EDITOR}
                onChange={(ev) => setForm({ ...form, firstname: ev.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Last name</Form.Label>
              <Form.Control
                value={form.lastname}
                readOnly={!isAdmin && user?.role !== ROLES.EDITOR}
                onChange={(ev) => setForm({ ...form, lastname: ev.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                value={form.username}
                readOnly={!isAdmin && user?.role !== ROLES.EDITOR}
                onChange={(ev) => setForm({ ...form, username: ev.target.value })}
              />
            </Form.Group>
            {isAdmin && (
              <Form.Group className="mb-3">
                <Form.Label>Role</Form.Label>
                <Form.Select
                  value={form.role}
                  disabled={editUser?.role === ROLES.ADMIN}
                  onChange={(ev) => setForm({ ...form, role: ev.target.value })}>
                  <option value={ROLES.USER}>User</option>
                  <option value={ROLES.EDITOR}>Editor</option>
                  <option value={ROLES.ADMIN}>Admin</option>
                </Form.Select>
                {editUser?.role === ROLES.ADMIN && <Form.Text className="text-muted">Admin role cannot be changed.</Form.Text>}
              </Form.Group>
            )}
            {isAdmin && editUser?.role === ROLES.ADMIN && <p className="text-muted small mb-0">Admin accounts cannot be deleted.</p>}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          {isAdmin ? (
            <>
              <Button variant="danger" onClick={() => handleAdminDelete(editUser)} disabled={editUser?.role === ROLES.ADMIN}>
                Delete Account?
              </Button>
              <Button variant="primary" onClick={handleAdminSave}>
                Save changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline-danger" onClick={() => handleEditorRequest('delete')}>
                Request delete
              </Button>
              <Button variant="primary" onClick={() => handleEditorRequest('update')}>
                Request changes
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default UsersPage
