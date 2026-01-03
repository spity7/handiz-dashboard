import { Card, CardBody, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import CreateCompetitionForms from './components/CreateCompetitionForms'
import PageMetaData from '@/components/PageTitle'

const CreateCompetition = () => {
  return (
    <>
      <PageBreadcrumb title="Create Competition" subName="Handiz" />
      <PageMetaData title="Create Competition" />

      <Row>
        <Col>
          <Card>
            <CardBody>
              <CreateCompetitionForms />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}
export default CreateCompetition
