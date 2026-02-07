import { useEffect, useState } from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import OfficesListTable from './components/OfficesListTable'

const Offices = () => {
  const { getAllOffices } = useGlobalContext()
  const [OfficesList, setOfficesList] = useState([])

  useEffect(() => {
    const fetchOffices = async () => {
      try {
        const data = await getAllOffices()
        setOfficesList(data)
      } catch (error) {
        console.error('Error fetching offices:', error)
      }
    }
    fetchOffices()
  }, [getAllOffices])

  return (
    <>
      <PageMetaData title="Offices List" />
      <PageBreadcrumb title="Offices List" subName="Handiz" />
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
                  <Link to="/ecommerce/offices/create" className="btn btn-primary d-flex align-items-center">
                    <IconifyIcon icon="bx:plus" className="me-1" />
                    Create Office
                  </Link>
                </div>
              </div>
            </CardBody>
            <div>{OfficesList.length > 0 ? <OfficesListTable offices={OfficesList} /> : <div className="text-center p-4">No Offices Found</div>}</div>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default Offices
