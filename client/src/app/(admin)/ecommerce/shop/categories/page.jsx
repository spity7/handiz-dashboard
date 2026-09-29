import { useCallback, useState } from 'react'
import { Button, Card, CardBody, Col, Form, Modal, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import { useGlobalContext } from '@/context/useGlobalContext'
import useFetchList from '@/hooks/useFetchList'

const ShopCategories = () => {
  const { getShopCategories, createShopCategory, updateShopCategory, deleteShopCategory } = useGlobalContext()
  const fetchCategories = useCallback(async () => getShopCategories(), [getShopCategories])
  const { items: categories, loading, refresh } = useFetchList(fetchCategories)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [order, setOrder] = useState(999)

  const openCreate = () => {
    setEditing(null)
    setName('')
    setDescription('')
    setOrder(999)
    setShowModal(true)
  }

  const openEdit = (cat) => {
    setEditing(cat)
    setName(cat.name)
    setDescription(cat.description || '')
    setOrder(cat.order ?? 999)
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await updateShopCategory(editing._id, { name, description, order })
      } else {
        await createShopCategory({ name, description, order })
      }
      setShowModal(false)
      refresh()
    } catch (e) {
      alert(e?.response?.data?.message || 'Save failed')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return
    try {
      await deleteShopCategory(id)
      refresh()
    } catch (e) {
      alert(e?.response?.data?.message || 'Delete failed')
    }
  }

  const columns = [
    { header: 'Name', accessorKey: 'name' },
    { header: 'Slug', accessorKey: 'slug' },
    { header: 'Order', accessorKey: 'order' },
    {
      header: 'Actions',
      cell: ({ row: { original: cat } }) => (
        <div className="d-flex gap-2">
          <Button size="sm" variant="soft-secondary" onClick={() => openEdit(cat)}>
            Edit
          </Button>
          <Button size="sm" variant="soft-danger" onClick={() => handleDelete(cat._id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageMetaData title="Shop Categories" />
      <PageBreadcrumb title="Shop Categories" subName="Handiz" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <Button onClick={openCreate} className="mb-3">
                Add category
              </Button>
              {loading ? <p>Loading…</p> : <ReactTable columns={columns} data={categories} pageSize={20} showPagination />}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editing ? 'Edit category' : 'New category'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control value={name} onChange={(e) => setName(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control value={description} onChange={(e) => setDescription(e.target.value)} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Sort order</Form.Label>
            <Form.Control type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default ShopCategories
