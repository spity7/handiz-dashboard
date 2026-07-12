import { useCallback } from 'react'
import { Badge, Card, CardBody, Col, Row, Table } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ProjectsListTableSkeleton from '@/components/skeletons/ProjectsListTableSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import useFetchList from '@/hooks/useFetchList'

const CourseEnrollments = () => {
  const { getAllEnrollments } = useGlobalContext()
  const fetchEnrollments = useCallback(async () => getAllEnrollments(), [getAllEnrollments])
  const { items: enrollments, loading } = useFetchList(fetchEnrollments)

  return (
    <>
      <PageMetaData title="Course Enrollments" />
      <PageBreadcrumb title="Enrollments" subName="LMS" />
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
                        <th>Status</th>
                        <th>Progress</th>
                        <th>Source</th>
                        <th>Enrolled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollments.map((e) => (
                        <tr key={e._id}>
                          <td>
                            {e.userId?.firstname} {e.userId?.lastname}
                            <br />
                            <small>{e.userId?.email}</small>
                          </td>
                          <td>{e.courseId?.title}</td>
                          <td>
                            <Badge bg={e.status === 'completed' ? 'success' : 'primary'}>{e.status}</Badge>
                          </td>
                          <td>{e.progressPercent}%</td>
                          <td>{e.source}</td>
                          <td>{new Date(e.enrolledAt).toLocaleDateString()}</td>
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

export default CourseEnrollments
