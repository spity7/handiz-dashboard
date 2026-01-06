import { useEffect, useState } from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import AiToolsListTable from './components/AiToolsListTable'

const AiTools = () => {
  const { getAllAiTools } = useGlobalContext()
  const [aiToolsList, setAiToolsList] = useState([])

  useEffect(() => {
    const fetchAiTools = async () => {
      try {
        const data = await getAllAiTools()
        setAiToolsList(data)
      } catch (error) {
        console.error('Error fetching aiTools:', error)
      }
    }
    fetchAiTools()
  }, [getAllAiTools])

  return (
    <>
      <PageMetaData title="AiTools List" />
      <PageBreadcrumb title="AiTools List" subName="Handiz" />
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
                  <Link to="/ecommerce/aiTools/create" className="btn btn-primary d-flex align-items-center">
                    <IconifyIcon icon="bx:plus" className="me-1" />
                    Create AiTool
                  </Link>
                </div>
              </div>
            </CardBody>

            <div>{aiToolsList.length > 0 ? <AiToolsListTable aiTools={aiToolsList} /> : <div className="text-center p-4">No AiTools Found</div>}</div>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default AiTools
