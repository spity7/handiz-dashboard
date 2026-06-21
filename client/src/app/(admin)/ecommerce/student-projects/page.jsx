import { Card, CardBody, Col, Row, Alert } from 'react-bootstrap'
import { Link, useSearchParams } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import { useAuthContext } from '@/context/useAuthContext'
import useProjectsList from '@/hooks/useProjectsList'
import { isProfileComplete } from '@/utils/profileComplete'
import ProjectsListTable from './components/ProjectsListTable'

const StudentProjects = () => {
  const { getAllProjects } = useGlobalContext()
  const { user } = useAuthContext()
  const { projects, loading, refresh } = useProjectsList(getAllProjects)
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightProjectId = searchParams.get('project')
  const ownerFilter = searchParams.get('owner') || ''
  const profileComplete = isProfileComplete(user)
  const createTarget = profileComplete
    ? '/ecommerce/student-projects/create'
    : { pathname: '/pages/account', state: { from: '/ecommerce/student-projects/create' } }

  const clearHighlightFromUrl = () => {
    if (!searchParams.has('project')) return
    const next = new URLSearchParams(searchParams)
    next.delete('project')
    setSearchParams(next, { replace: true })
  }

  return (
    <>
      <PageMetaData title="Student Projects List" />
      <PageBreadcrumb title="Student Projects List" subName="Handiz" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              {!profileComplete && (
                <Alert variant="warning" className="mb-3">
                  Verify your account with a mobile number and Instagram URL before creating or editing student projects.{' '}
                  <Link to="/pages/account" state={{ from: '/ecommerce/student-projects' }}>
                    Go to profile settings
                  </Link>
                </Alert>
              )}
              <div className="d-flex flex-wrap justify-content-start gap-3">
                <Link to={createTarget} className="btn btn-primary d-flex align-items-center">
                  <IconifyIcon icon="bx:plus" className="me-1" />
                  Create Student Project
                </Link>
              </div>
            </CardBody>
            <div>
              <ProjectsListTable
                projects={projects}
                isLoading={loading}
                onRefresh={refresh}
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
