import { useCallback } from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import ProjectsListTableSkeleton from '@/components/skeletons/ProjectsListTableSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import useFetchList from '@/hooks/useFetchList'
import OfficesListTable from './components/OfficesListTable'

const Offices = () => {
  const { getAllOffices } = useGlobalContext()
  const fetchOffices = useCallback(async () => getAllOffices(), [getAllOffices])
  const { items: officesList, loading, refresh } = useFetchList(fetchOffices)

  return (
    <>
      <PageMetaData title="Offices List" />
      <PageBreadcrumb title="Offices List" subName="Handiz" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between gap-3">
                <div>
                  <Link to="/ecommerce/offices/create" className="btn btn-primary d-flex align-items-center">
                    <IconifyIcon icon="bx:plus" className="me-1" />
                    Create Office
                  </Link>
                </div>
              </div>
            </CardBody>
            <div>
              {loading ? (
                <ProjectsListTableSkeleton variant="media-order" />
              ) : officesList.length > 0 ? (
                <OfficesListTable offices={officesList} onRefresh={refresh} />
              ) : (
                <div className="text-center p-4">No Offices Found</div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default Offices
