import { useCallback, useEffect, useState } from 'react'
import { Card, CardBody, Col, Row, Button, Form, Table, Badge } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import Swal from 'sweetalert2'

const apiErrorMessage = (error, fallback) => {
  const data = error?.response?.data
  if (data == null) return error?.message || fallback
  if (typeof data === 'string') return data.trim() || fallback
  if (typeof data.message === 'string') return data.message
  return fallback
}

const StudentProjectLocationsPage = () => {
  const { getStudentProjectLocations, createStudentProjectLocation, updateStudentProjectLocation, deleteStudentProjectLocation } = useGlobalContext()

  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [savingNew, setSavingNew] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const load = useCallback(async () => {
    try {
      const list = await getStudentProjectLocations()
      setLocations(Array.isArray(list) ? list : [])
    } catch (e) {
      console.error(e)
      Swal.fire('Error', apiErrorMessage(e, 'Failed to load locations'), 'error')
    } finally {
      setLoading(false)
    }
  }, [getStudentProjectLocations])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) {
      Swal.fire('Validation', 'Enter a location name', 'warning')
      return
    }
    try {
      setSavingNew(true)
      await createStudentProjectLocation(name)
      setNewName('')
      await load()
      Swal.fire('Created', 'Location added.', 'success')
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Create failed'), 'error')
    } finally {
      setSavingNew(false)
    }
  }

  const startEdit = (l) => {
    setEditingId(l._id)
    setEditName(l.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const saveEdit = async (id) => {
    const name = editName.trim()
    if (!name) {
      Swal.fire('Validation', 'Name cannot be empty', 'warning')
      return
    }
    try {
      setSavingEdit(true)
      await updateStudentProjectLocation(id, name)
      cancelEdit()
      await load()
      Swal.fire('Saved', 'Location updated.', 'success')
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Update failed'), 'error')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async (l) => {
    if (l.isFallback) {
      Swal.fire('Not allowed', 'The Others location cannot be deleted.', 'info')
      return
    }

    const result = await Swal.fire({
      title: 'Delete location?',
      html: `Projects with <strong>${l.name}</strong> will have it replaced with <strong>Others</strong>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    })

    if (!result.isConfirmed) return

    try {
      const data = await deleteStudentProjectLocation(l._id)
      await load()
      const n = data?.reassignedCount ?? 0
      Swal.fire('Deleted', n > 0 ? `${n} project(s) updated with Others.` : 'Location removed.', 'success')
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Delete failed'), 'error')
    }
  }

  return (
    <>
      <PageMetaData title="Student Project Locations" />
      <PageBreadcrumb title="Student Project Locations" subName="Handiz" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between gap-3 mb-4">
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <Link to="/ecommerce/student-projects" className="btn btn-soft-secondary d-flex align-items-center">
                    <IconifyIcon icon="bx:left-arrow-alt" className="me-1" />
                    Student Projects
                  </Link>
                  <Link to="/ecommerce/student-projects/create" className="btn btn-primary d-flex align-items-center">
                    <IconifyIcon icon="bx:plus" className="me-1" />
                    Create project
                  </Link>
                </div>
              </div>

              <Form onSubmit={handleCreate} className="mb-4">
                <Row className="g-2 align-items-end">
                  <Col md={6} lg={4}>
                    <Form.Group>
                      <Form.Label>New location</Form.Label>
                      <Form.Control value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Lebanon" maxLength={80} />
                    </Form.Group>
                  </Col>
                  <Col xs="auto">
                    <Button type="submit" disabled={savingNew}>
                      {savingNew ? 'Adding…' : 'Add'}
                    </Button>
                  </Col>
                </Row>
              </Form>

              {loading ? (
                <p className="text-muted mb-0">Loading…</p>
              ) : locations.length === 0 ? (
                <p className="text-muted mb-0">No locations yet. Add one above to use in Student Projects.</p>
              ) : (
                <div className="table-responsive">
                  <Table className="mb-0 align-middle" hover>
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th style={{ width: 120 }}>Type</th>
                        <th className="text-end" style={{ width: 200 }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((l) => (
                        <tr key={l._id}>
                          <td>
                            {editingId === l._id ? (
                              <Form.Control value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={80} size="sm" />
                            ) : (
                              l.name
                            )}
                          </td>
                          <td>{l.isFallback ? <Badge bg="secondary">Others (fallback)</Badge> : <span className="text-muted">—</span>}</td>
                          <td className="text-end">
                            {editingId === l._id ? (
                              <div className="d-flex gap-1 justify-content-end flex-wrap">
                                <Button size="sm" variant="primary" disabled={savingEdit} onClick={() => saveEdit(l._id)}>
                                  Save
                                </Button>
                                <Button size="sm" variant="light" onClick={cancelEdit} disabled={savingEdit}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="d-flex gap-1 justify-content-end flex-wrap">
                                <button type="button" className="btn btn-sm btn-soft-secondary" onClick={() => startEdit(l)} title="Edit name">
                                  <IconifyIcon icon="bx:edit" className="fs-16" />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-soft-danger"
                                  disabled={l.isFallback}
                                  title={l.isFallback ? 'Cannot delete Others' : 'Delete'}
                                  onClick={() => handleDelete(l)}>
                                  <IconifyIcon icon="bx:trash" className="fs-16" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default StudentProjectLocationsPage
