import { useEffect, useState } from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import CompetitionsListTable from './components/CompetitionsListTable'

const Competitions = () => {
  const { getAllCompetitions } = useGlobalContext()
  const [competitionsList, setCompetitionsList] = useState([])

  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const data = await getAllCompetitions()
        setCompetitionsList(data)
      } catch (error) {
        console.error('Error fetching competitions:', error)
      }
    }
    fetchCompetitions()
  }, [getAllCompetitions])

  return (
    <>
      <PageMetaData title="Competitions List" />
      <PageBreadcrumb title="Competitions List" subName="Handiz" />
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
                  <Link to="/ecommerce/competitions/create" className="btn btn-primary d-flex align-items-center">
                    <IconifyIcon icon="bx:plus" className="me-1" />
                    Create Competition
                  </Link>
                </div>
              </div>
            </CardBody>

            <div>
              {competitionsList.length > 0 ? (
                <CompetitionsListTable competitions={competitionsList} />
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
