import { useCallback } from 'react'
import { Badge, Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import ProjectsListTableSkeleton from '@/components/skeletons/ProjectsListTableSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import useFetchList from '@/hooks/useFetchList'
import CoursesListTable from './components/CoursesListTable'

const Courses = () => {
  const { getAllCourses } = useGlobalContext()
  const fetchCourses = useCallback(async () => getAllCourses(true), [getAllCourses])
  const { items: coursesList, loading, refreshing, refresh } = useFetchList(fetchCourses)

  return (
    <>
      <PageMetaData title="Courses" />
      <PageBreadcrumb title="Courses" subName="LMS" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between gap-3">
                <Link to="/ecommerce/courses/create" className="btn btn-primary d-flex align-items-center">
                  <IconifyIcon icon="bx:plus" className="me-1" />
                  Create Course
                </Link>
                <div className="d-flex gap-2">
                  <Link to="/ecommerce/courses/enrollments" className="btn btn-outline-secondary">
                    Enrollments
                  </Link>
                  <Link to="/ecommerce/courses/orders" className="btn btn-outline-secondary">
                    Orders
                  </Link>
                </div>
              </div>
            </CardBody>
            <div className="courses-list-table-container">
              {loading ? (
                <ProjectsListTableSkeleton variant="media-order" />
              ) : (
                <CoursesListTable courses={coursesList} onRefresh={refresh} refreshing={refreshing} />
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default Courses
