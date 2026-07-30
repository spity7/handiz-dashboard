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
import LmsSectionNav from './components/LmsSectionNav'

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
            <CardBody className="courses-toolbar-card-body">
              <div className="courses-page-toolbar">
                <Link to="/ecommerce/courses/create" className="btn btn-primary btn-sm d-inline-flex align-items-center">
                  <IconifyIcon icon="bx:plus" className="me-1" />
                  Create Course
                </Link>
                <LmsSectionNav />
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
