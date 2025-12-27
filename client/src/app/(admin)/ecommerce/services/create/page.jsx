import { Card, CardBody, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import CreateServiceForms from './components/CreateServiceForms'
import PageMetaData from '@/components/PageTitle'

const CreateService = () => {
  return (
    <>
      <PageBreadcrumb title="Create Service" subName="Vertex" />
      <PageMetaData title="Create Service" />

      <Row>
        <Col>
          <Card>
            <CardBody>
              <CreateServiceForms />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}
export default CreateService
