import { Card, CardBody, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import CreateAiToolForms from './components/CreateAiToolForms'
import PageMetaData from '@/components/PageTitle'

const CreateAiTool = () => {
  return (
    <>
      <PageBreadcrumb title="Create AiTool" subName="Handiz" />
      <PageMetaData title="Create AiTool" />

      <Row>
        <Col>
          <Card>
            <CardBody>
              <CreateAiToolForms />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}
export default CreateAiTool
