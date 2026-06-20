import { useCallback } from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import ProjectsListTableSkeleton from '@/components/skeletons/ProjectsListTableSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import useFetchList from '@/hooks/useFetchList'
import ServicesListTable from './components/ServicesListTable'

const Services = () => {
  const { getAllServices } = useGlobalContext()
  const fetchServices = useCallback(async () => getAllServices(), [getAllServices])
  const { items: servicesList, loading, refresh } = useFetchList(fetchServices)

  return (
    <>
      <PageMetaData title="Services List" />
      <PageBreadcrumb title="Services List" subName="Vertex" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between gap-3">
                <div>
                  <Link to="/ecommerce/services/create" className="btn btn-primary d-flex align-items-center">
                    <IconifyIcon icon="bx:plus" className="me-1" />
                    Create Service
                  </Link>
                </div>
              </div>
            </CardBody>
            <div>
              {loading ? (
                <ProjectsListTableSkeleton variant="vertex" />
              ) : servicesList.length > 0 ? (
                <ServicesListTable services={servicesList} onRefresh={refresh} />
              ) : (
                <div className="text-center p-4">No services found</div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </>
  )
}
export default Services
