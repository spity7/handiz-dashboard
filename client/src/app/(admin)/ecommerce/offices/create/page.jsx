import { Card, CardBody, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import CreateOfficeForms from './components/CreateOfficeForms'
import PageMetaData from '@/components/PageTitle'

const CreateOffice = () => {
  return (
    <>
      <PageBreadcrumb title="Create Office" subName="Handiz" />
      <PageMetaData title="Create Office" />

      <Row>
        <Col>
          <Card>
            <CardBody>
              <CreateOfficeForms />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}
export default CreateOffice
