import { useEffect, useState } from 'react'
import { Badge, Button, Card, CardBody, Col, Form, Row } from 'react-bootstrap'
import { useParams } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import { useGlobalContext } from '@/context/useGlobalContext'

const FULFILLMENT_OPTIONS = ['processing', 'shipped', 'delivered', 'cancelled']

const ShopOrderDetail = () => {
  const { id } = useParams()
  const { getShopOrderById, updateShopOrderFulfillment, cancelShopOrder } = useGlobalContext()
  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState('')
  const [note, setNote] = useState('')

  const reload = () => getShopOrderById(id).then(setOrder)

  useEffect(() => {
    reload().catch(console.error)
  }, [id])

  if (!order) return <p className="p-4">Loading…</p>

  const handleFulfillment = async () => {
    try {
      await updateShopOrderFulfillment(id, { status, note })
      await reload()
      alert('Updated')
    } catch (e) {
      alert(e?.response?.data?.message || 'Update failed')
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order?')) return
    try {
      await cancelShopOrder(id)
      await reload()
    } catch (e) {
      alert(e?.response?.data?.message || 'Cancel failed')
    }
  }

  return (
    <>
      <PageMetaData title={`Order ${order.orderNumber}`} />
      <PageBreadcrumb title={order.orderNumber} subName="Shop order" />
      <Row>
        <Col lg={8}>
          <Card className="mb-3">
            <CardBody>
              <h5>Items</h5>
              <ul className="list-unstyled">
                {order.items.map((item, i) => (
                  <li key={i} className="d-flex justify-content-between border-bottom py-2">
                    <span>
                      {item.title} × {item.quantity}
                    </span>
                    <span>${Number(item.lineTotal).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="d-flex justify-content-between">
                <span>Subtotal</span>
                <span>${Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Shipping</span>
                <span>${Number(order.shippingFee).toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between fw-bold mt-2">
                <span>Total</span>
                <span>${Number(order.total).toFixed(2)}</span>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h5>Shipping</h5>
              <p className="mb-1">{order.shippingAddress?.fullName}</p>
              <p className="mb-1">{order.shippingAddress?.phone}</p>
              <p className="mb-0 text-muted">
                {order.shippingAddress?.street}, {order.shippingAddress?.building}
                <br />
                {order.shippingAddress?.area}, {order.shippingAddress?.city}, {order.shippingAddress?.governorate}
              </p>
              {order.shippingAddress?.notes && <p className="mt-2 small">Notes: {order.shippingAddress.notes}</p>}
            </CardBody>
          </Card>
        </Col>
        <Col lg={4}>
          <Card>
            <CardBody>
              <p>
                Payment: <Badge bg="secondary">{order.paymentStatus}</Badge>
              </p>
              <p>
                Fulfillment: <Badge bg="info">{order.fulfillmentStatus}</Badge>
              </p>
              {order.paymentStatus === 'paid' && (
                <>
                  <Form.Group className="mb-2">
                    <Form.Label>Update fulfillment</Form.Label>
                    <Form.Select value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="">Select…</option>
                      {FULFILLMENT_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Note</Form.Label>
                    <Form.Control value={note} onChange={(e) => setNote(e.target.value)} />
                  </Form.Group>
                  <Button className="w-100 mb-2" onClick={handleFulfillment} disabled={!status}>
                    Save status
                  </Button>
                </>
              )}
              {order.fulfillmentStatus !== 'cancelled' && (
                <Button variant="outline-danger" className="w-100" onClick={handleCancel}>
                  Cancel order
                </Button>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default ShopOrderDetail
