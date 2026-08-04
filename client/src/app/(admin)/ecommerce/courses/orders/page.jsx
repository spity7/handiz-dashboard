import { useCallback, useMemo } from 'react'
import { Badge, Card, CardBody, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import ProjectsListTableSkeleton from '@/components/skeletons/ProjectsListTableSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import useFetchList from '@/hooks/useFetchList'
import LmsListEmptyState from '../components/LmsListEmptyState'
import LmsSectionNav from '../components/LmsSectionNav'

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

  const columns = useMemo(
    () => [
      {
        id: 'student',
        header: 'Student',
        cell: ({ row: { original: order } }) => order.userId?.email,
      },
      {
        id: 'course',
        header: 'Course',
        cell: ({ row: { original: order } }) => order.courseId?.title,
      },
      {
        id: 'amount',
        header: 'Amount',
        cell: ({ row: { original: order } }) => `${order.currency} ${order.amount}`,
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row: { original: order } }) => <Badge bg={statusVariant(order.status)}>{order.status}</Badge>,
      },
      {
        id: 'date',
        header: 'Date',
        cell: ({ row: { original: order } }) =>
          order.paidAt ? new Date(order.paidAt).toLocaleDateString() : new Date(order.createdAt).toLocaleDateString(),
      },
    ],
    [],
  )

  const emptyState = <LmsListEmptyState preset="orders" inTable />

  return (
    <>
      <PageMetaData title="Course Orders" />
      <PageBreadcrumb title="Orders" subName="LMS" />
      <Row className="mb-3">
        <Col>
          <div className="courses-page-toolbar">
            <LmsSectionNav />
          </div>
        </Col>
      </Row>
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
                <ReactTable
                  columns={columns}
                  data={orders}
                  rowsPerPageList={[5, 10, 20, 50]}
                  pageSize={10}
                  tableClass="text-nowrap mb-0 align-middle"
                  theadClass="bg-light bg-opacity-50"
                  showPagination={orders.length > 0}
                  emptyState={emptyState}
                />
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default CourseOrders
