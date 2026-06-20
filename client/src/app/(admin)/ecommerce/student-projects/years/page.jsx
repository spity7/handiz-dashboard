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

const StudentProjectYearsPage = () => {
  const { getStudentProjectYears, createStudentProjectYear, updateStudentProjectYear, deleteStudentProjectYear } = useGlobalContext()

  const [years, setYears] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [savingNew, setSavingNew] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const load = useCallback(async () => {
    try {
      const list = await getStudentProjectYears()
      setYears(Array.isArray(list) ? list : [])
    } catch (e) {
      console.error(e)
      Swal.fire('Error', apiErrorMessage(e, 'Failed to load years'), 'error')
    } finally {
      setLoading(false)
    }
  }, [getStudentProjectYears])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) {
      Swal.fire('Validation', 'Enter a year name', 'warning')
      return
    }
    try {
      setSavingNew(true)
      await createStudentProjectYear(name)
      setNewName('')
      await load()
      Swal.fire('Created', 'Year added.', 'success')
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Create failed'), 'error')
    } finally {
      setSavingNew(false)
    }
  }

  const startEdit = (y) => {
    setEditingId(y._id)
    setEditName(y.name)
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
      await updateStudentProjectYear(id, name)
      cancelEdit()
      await load()
      Swal.fire('Saved', 'Year updated.', 'success')
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Update failed'), 'error')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async (y) => {
    if (y.isFallback) {
      Swal.fire('Not allowed', 'The Others year cannot be deleted.', 'info')
      return
    }

    const result = await Swal.fire({
      title: 'Delete year?',
      html: `Projects with <strong>${y.name}</strong> will have it replaced with <strong>Others</strong>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    })

    if (!result.isConfirmed) return

    try {
      const data = await deleteStudentProjectYear(y._id)
      await load()
      const n = data?.reassignedCount ?? 0
      Swal.fire('Deleted', n > 0 ? `${n} project(s) updated with Others.` : 'Year removed.', 'success')
    } catch (error) {
      Swal.fire('Error', apiErrorMessage(error, 'Delete failed'), 'error')
    }
  }

  return (
    <>
      <PageMetaData title="Student Project Years" />
      <PageBreadcrumb title="Student Project Years" subName="Handiz" />
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
                      <Form.Label>New year</Form.Label>
                      <Form.Control value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. 2025-2026" maxLength={80} />
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
              ) : years.length === 0 ? (
                <p className="text-muted mb-0">No years yet. Add one above to use in Student Projects.</p>
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
                      {years.map((y) => (
                        <tr key={y._id}>
                          <td>
                            {editingId === y._id ? (
                              <Form.Control value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={80} size="sm" />
                            ) : (
                              y.name
                            )}
                          </td>
                          <td>{y.isFallback ? <Badge bg="secondary">Others (fallback)</Badge> : <span className="text-muted">—</span>}</td>
                          <td className="text-end">
                            {editingId === y._id ? (
                              <div className="d-flex gap-1 justify-content-end flex-wrap">
                                <Button size="sm" variant="primary" disabled={savingEdit} onClick={() => saveEdit(y._id)}>
                                  Save
                                </Button>
                                <Button size="sm" variant="light" onClick={cancelEdit} disabled={savingEdit}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="d-flex gap-1 justify-content-end flex-wrap">
                                <button type="button" className="btn btn-sm btn-soft-secondary" onClick={() => startEdit(y)} title="Edit name">
                                  <IconifyIcon icon="bx:edit" className="fs-16" />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-soft-danger"
                                  disabled={y.isFallback}
                                  title={y.isFallback ? 'Cannot delete Others' : 'Delete'}
                                  onClick={() => handleDelete(y)}>
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

export default StudentProjectYearsPage
