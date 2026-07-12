import { useCallback } from 'react'
import { Badge, Card, CardBody, Col, Row, Table } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ProjectsListTableSkeleton from '@/components/skeletons/ProjectsListTableSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import useFetchList from '@/hooks/useFetchList'

const statusVariant = (status) => {
  if (status === 'paid') return 'success'
  if (status === 'refunded') return 'warning'
  if (status === 'failed') return 'danger'
  return 'secondary'
}

const CourseOrders = () => {
  const { getOrders } = useGlobalContext()
  const fetchOrders = useCallback(async () => getOrders(), [getOrders])
  const { items: orders, loading } = useFetchList(fetchOrders)

  const totalRevenue = orders.filter((o) => o.status === 'paid').reduce((sum, o) => sum + (o.amount || 0), 0)

  return (
    <>
      <PageMetaData title="Course Orders" />
      <PageBreadcrumb title="Orders" subName="LMS" />
      <Row className="mb-3">
        <Col md={4}>
          <Card>
            <CardBody>
              <small className="text-muted">Total Revenue</small>
              <h4>${totalRevenue.toFixed(2)}</h4>
            </CardBody>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <CardBody>
              <small className="text-muted">Paid Orders</small>
              <h4>{orders.filter((o) => o.status === 'paid').length}</h4>
            </CardBody>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col>
          <Card>
            <CardBody>
              {loading ? (
                <ProjectsListTableSkeleton />
              ) : (
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Course</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o._id}>
                          <td>{o.userId?.email}</td>
                          <td>{o.courseId?.title}</td>
                          <td>
                            {o.currency} {o.amount}
                          </td>
                          <td>
                            <Badge bg={statusVariant(o.status)}>{o.status}</Badge>
                          </td>
                          <td>{o.paidAt ? new Date(o.paidAt).toLocaleDateString() : new Date(o.createdAt).toLocaleDateString()}</td>
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

export default CourseOrders
