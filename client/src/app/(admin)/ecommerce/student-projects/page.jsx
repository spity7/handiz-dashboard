import { useEffect, useState } from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link, useSearchParams } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import ProjectsListTable from './components/ProjectsListTable'

const StudentProjects = () => {
  const { getAllProjects } = useGlobalContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightProjectId = searchParams.get('project')
  const ownerFilter = searchParams.get('owner') || ''

  const clearHighlightFromUrl = () => {
    if (!searchParams.has('project')) return
    const next = new URLSearchParams(searchParams)
    next.delete('project')
    setSearchParams(next, { replace: true })
  }
  const [studentProjectsList, setStudentProjectsList] = useState([])

  const fetchProjects = async () => {
    try {
      const data = await getAllProjects()
      setStudentProjectsList(data)
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  useEffect(() => {
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
              <ProjectsListTable
                projects={studentProjectsList}
                onRefresh={fetchProjects}
                highlightProjectId={highlightProjectId}
                onClearHighlight={clearHighlightFromUrl}
                initialOwnerFilter={ownerFilter}
              />
            </div>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default StudentProjects
