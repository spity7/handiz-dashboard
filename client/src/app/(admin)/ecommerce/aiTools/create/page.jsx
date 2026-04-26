import { Card, CardBody, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import CreateAiToolForms from './components/CreateAiToolForms'
import PageMetaData from '@/components/PageTitle'

const CreateAiTool = () => {
  return (
    <>
      <PageBreadcrumb title="Create AI Prompt" subName="Handiz" />
      <PageMetaData title="Create AI Prompt" />

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
