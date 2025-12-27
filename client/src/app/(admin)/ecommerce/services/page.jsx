import { useEffect, useState } from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import ServicesListTable from './components/ServicesListTable'

const Services = () => {
  const { getAllServices } = useGlobalContext()
  const [servicesList, setServicesList] = useState([])

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await getAllServices()
        setServicesList(data)
      } catch (error) {
        console.error('Error fetching services:', error)
      }
    }
    fetchServices()
  }, [getAllServices])

  return (
    <>
      <PageMetaData title="Services List" />
      <PageBreadcrumb title="Services List" subName="Vertex" />
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
                  <Link to="/ecommerce/services/create" className="btn btn-primary d-flex align-items-center">
                    <IconifyIcon icon="bx:plus" className="me-1" />
                    Create Service
                  </Link>
                </div>
              </div>
            </CardBody>
            <div>
              {servicesList.length > 0 ? <ServicesListTable services={servicesList} /> : <div className="text-center p-4">No services found</div>}
            </div>
          </Card>
        </Col>
      </Row>
    </>
  )
}
export default Services
