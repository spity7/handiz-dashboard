import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import useProjectsList from '@/hooks/useProjectsList'
import ProjectsListTable from './components/ProjectsListTable'

const Projects = () => {
  const { getAllProjects } = useGlobalContext()
  const { projects, loading, refresh } = useProjectsList(getAllProjects)

  return (
    <>
      <PageMetaData title="Projects List" />
      <PageBreadcrumb title="Projects List" subName="Vertex" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between gap-3">
                {/* <div className="search-bar">
                  <span>
                    <IconifyIcon icon="bx:search-alt" className="mb-1" />
                  </span>
                  <input type="search" className="form-control" id="search" placeholder="Search ..." />
                </div> */}
                <div>
                  <Link to="/ecommerce/projects/create" className="btn btn-primary d-flex align-items-center">
                    <IconifyIcon icon="bx:plus" className="me-1" />
                    Create Project
                  </Link>
                </div>
              </div>
            </CardBody>
            <div>
              <ProjectsListTable projects={projects} isLoading={loading} onRefresh={refresh} />
            </div>
          </Card>
        </Col>
      </Row>
    </>
  )
}
export default Projects
