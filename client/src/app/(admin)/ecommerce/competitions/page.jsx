import { useCallback } from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import ProjectsListTableSkeleton from '@/components/skeletons/ProjectsListTableSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import useFetchList from '@/hooks/useFetchList'
import CompetitionsListTable from './components/CompetitionsListTable'

const Competitions = () => {
  const { getAllCompetitions } = useGlobalContext()
  const fetchCompetitions = useCallback(async () => getAllCompetitions(), [getAllCompetitions])
  const { items: competitionsList, loading, refresh } = useFetchList(fetchCompetitions)

  return (
    <>
      <PageMetaData title="Competitions List" />
      <PageBreadcrumb title="Competitions List" subName="Handiz" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between gap-3">
                <div>
                  <Link to="/ecommerce/competitions/create" className="btn btn-primary d-flex align-items-center">
                    <IconifyIcon icon="bx:plus" className="me-1" />
                    Create Competition
                  </Link>
                </div>
              </div>
            </CardBody>

            <div>
              {loading ? (
                <ProjectsListTableSkeleton variant="media-order" />
              ) : competitionsList.length > 0 ? (
                <CompetitionsListTable competitions={competitionsList} onRefresh={refresh} />
              ) : (
                <div className="text-center p-4">No Competitions Found</div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default Competitions
