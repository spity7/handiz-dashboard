import { useCallback, useEffect, useState } from 'react'
import { Card, CardBody, Col, Row, Button, Form, Table, Badge } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import StudentProjectFieldTableSkeleton from '@/components/skeletons/StudentProjectFieldTableSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import Swal from 'sweetalert2'

const apiErrorMessage = (error, fallback) => {
  const data = error?.response?.data
  if (data == null) return error?.message || fallback
  if (typeof data === 'string') return data.trim() || fallback
  if (typeof data.message === 'string') return data.message
  return fallback
}

const StudentProjectConceptsPage = () => {
  const { getStudentProjectConcepts, createStudentProjectConcept, updateStudentProjectConcept, deleteStudentProjectConcept } = useGlobalContext()

  const [concepts, setConcepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [savingNew, setSavingNew] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const load = useCallback(async () => {
    try {
      const list = await getStudentProjectConcepts()
      setConcepts(Array.isArray(list) ? list : [])
    } catch (e) {
      console.error(e)
      Swal.fire('Error', apiErrorMessage(e, 'Failed to load concepts'), 'error')
    } finally {
      setLoading(false)
    }
  }, [getStudentProjectConcepts])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) {
      Swal.fire('Validation', 'Enter a concept name', 'warning')
      return
    }
    try {
      setSavingNew(true)
      await createStudentProjectConcept(name)
      setNewName('')
      await load()
      Swal.fire('Created', 'Concept added.', 'success')
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Create failed'), 'error')
    } finally {
      setSavingNew(false)
    }
  }

  const startEdit = (c) => {
    setEditingId(c._id)
    setEditName(c.name)
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
      await updateStudentProjectConcept(id, name)
      cancelEdit()
      await load()
      Swal.fire('Saved', 'Concept updated.', 'success')
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Update failed'), 'error')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async (c) => {
    if (c.isFallback) {
      Swal.fire('Not allowed', 'The Others concept cannot be deleted.', 'info')
      return
    }

    const result = await Swal.fire({
      title: 'Delete concept?',
      html: `Projects with <strong>${c.name}</strong> will have it replaced with <strong>Others</strong>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    })

    if (!result.isConfirmed) return

    try {
      const data = await deleteStudentProjectConcept(c._id)
      await load()
      const n = data?.reassignedCount ?? 0
      Swal.fire('Deleted', n > 0 ? `${n} project(s) updated with Others.` : 'Concept removed.', 'success')
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Delete failed'), 'error')
    }
  }

  return (
    <>
      <PageMetaData title="Student Project Concepts" />
      <PageBreadcrumb title="Student Project Concepts" subName="Handiz" />
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
                      <Form.Label>New concept</Form.Label>
                      <Form.Control value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Sustainability" maxLength={80} />
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
                <StudentProjectFieldTableSkeleton />
              ) : concepts.length === 0 ? (
                <p className="text-muted mb-0">No concepts yet. Add one above to use in Student Projects.</p>
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
                      {concepts.map((c) => (
                        <tr key={c._id}>
                          <td>
                            {editingId === c._id ? (
                              <Form.Control value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={80} size="sm" />
                            ) : (
                              c.name
                            )}
                          </td>
                          <td>{c.isFallback ? <Badge bg="secondary">Others (fallback)</Badge> : <span className="text-muted">—</span>}</td>
                          <td className="text-end">
                            {editingId === c._id ? (
                              <div className="d-flex gap-1 justify-content-end flex-wrap">
                                <Button size="sm" variant="primary" disabled={savingEdit} onClick={() => saveEdit(c._id)}>
                                  Save
                                </Button>
                                <Button size="sm" variant="light" onClick={cancelEdit} disabled={savingEdit}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="d-flex gap-1 justify-content-end flex-wrap">
                                <button type="button" className="btn btn-sm btn-soft-secondary" onClick={() => startEdit(c)} title="Edit name">
                                  <IconifyIcon icon="bx:edit" className="fs-16" />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-soft-danger"
                                  disabled={c.isFallback}
                                  title={c.isFallback ? 'Cannot delete Others' : 'Delete'}
                                  onClick={() => handleDelete(c)}>
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

export default StudentProjectConceptsPage
