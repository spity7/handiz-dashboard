import { useCallback } from 'react'
import clsx from 'clsx'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useLmsAsyncBusy } from '@/context/LmsAsyncBusyContext'
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
  const toolbarLocked = loading || refreshing

  useLmsAsyncBusy(toolbarLocked)

  return (
    <>
      <PageMetaData title="Courses" />
      <PageBreadcrumb title="Courses" subName="LMS" />
      <Row>
        <Col>
          <Card>
            <CardBody className="courses-toolbar-card-body">
              <div className="courses-page-toolbar">
                <Link
                  to="/ecommerce/courses/create"
                  className={clsx('btn btn-primary btn-sm d-inline-flex align-items-center', toolbarLocked && 'disabled pe-none opacity-50')}
                  aria-disabled={toolbarLocked}
                  tabIndex={toolbarLocked ? -1 : undefined}
                  onClick={(event) => {
                    if (toolbarLocked) event.preventDefault()
                  }}>
                  <IconifyIcon icon="bx:plus" className="me-1" />
                  Create Course
                </Link>
                <LmsSectionNav disabled={toolbarLocked} />
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
