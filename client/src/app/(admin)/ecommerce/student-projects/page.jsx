import { useEffect, useState } from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import ProjectsListTable from './components/ProjectsListTable'

const StudentProjects = () => {
  const { getAllProjects } = useGlobalContext()
  const [studentProjectsList, setStudentProjectsList] = useState([])

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await getAllProjects()
        setStudentProjectsList(data)
      } catch (error) {
        console.error('Error fetching projects:', error)
      }
    }
    fetchProjects()
  }, [getAllProjects])

  return (
    <>
      <PageMetaData title="Student Projects List" />
      <PageBreadcrumb title="Student Projects List" subName="Handiz" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap justify-content-start gap-3">
                <Link to="/ecommerce/student-projects/create" className="btn btn-primary d-flex align-items-center">
                  <IconifyIcon icon="bx:plus" className="me-1" />
                  Create Student Project
                </Link>
              </div>
            </CardBody>
            <div>
              {studentProjectsList.length > 0 ? (
                <ProjectsListTable projects={studentProjectsList} />
              ) : (
                <div className="text-center p-4">No Student Projects Found</div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default StudentProjects
