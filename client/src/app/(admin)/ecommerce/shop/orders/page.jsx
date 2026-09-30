import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import ProjectsListTableSkeleton from '@/components/skeletons/ProjectsListTableSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import LmsListEmptyState from '../../courses/components/LmsListEmptyState'

const paymentVariant = (status) => {
  if (status === 'paid') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'refunded') return 'warning'
  return 'secondary'
}

const ShopOrders = () => {
  const { getShopOrders } = useGlobalContext()
  const [data, setData] = useState({ orders: [], summary: [] })
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getShopOrders({ q: query || undefined, limit: 100 })
      setData(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [getShopOrders, query])

  useEffect(() => {
    load()
  }, [load])

  const paidRevenue = (data.summary || []).filter((s) => s._id === 'paid').reduce((sum, s) => sum + (s.revenue || 0), 0)

  const columns = useMemo(
    () => [
      {
        header: 'Order',
        cell: ({ row: { original: order } }) => <Link to={`/ecommerce/shop/orders/${order._id}`}>{order.orderNumber}</Link>,
      },
      {
        header: 'Customer',
        cell: ({ row: { original: order } }) => order.userId?.email || order.shippingAddress?.fullName,
      },
      {
        header: 'Total',
        cell: ({ row: { original: order } }) => `$${Number(order.total).toFixed(2)}`,
      },
      {
        header: 'Payment',
        cell: ({ row: { original: order } }) => <Badge bg={paymentVariant(order.paymentStatus)}>{order.paymentStatus}</Badge>,
      },
      {
        header: 'Fulfillment',
        cell: ({ row: { original: order } }) => <Badge bg="info">{order.fulfillmentStatus}</Badge>,
      },
      {
        header: 'Date',
        cell: ({ row: { original: order } }) => new Date(order.createdAt).toLocaleString(),
      },
    ],
    [],
  )

  return (
    <>
      <PageMetaData title="Shop Orders" />
      <PageBreadcrumb title="Shop Orders" subName="Handiz" />
      <Row className="mb-3">
        <Col md={4}>
          <Card>
            <CardBody>
              <small className="text-muted">Paid revenue</small>
              <h4>${paidRevenue.toFixed(2)}</h4>
            </CardBody>
          </Card>
        </Col>
      </Row>
      <Row className="mb-3">
        <Col md={6}>
          <input
            className="form-control"
            placeholder="Search order number, name, phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        </Col>
        <Col md={2}>
          <button type="button" className="btn btn-primary" onClick={load}>
            Search
          </button>
        </Col>
      </Row>
      <Row>
        <Col>
          <Card>
            <CardBody>
              {loading ? (
                <ProjectsListTableSkeleton />
              ) : (
                <ReactTable
                  columns={columns}
                  data={data.orders || []}
                  pageSize={20}
                  showPagination={(data.orders || []).length > 0}
                  emptyState={<LmsListEmptyState preset="shopOrders" variant={query.trim() ? 'filtered' : 'empty'} inTable onClearFilters={() => setQuery('')} />}
                />
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default ShopOrders
