import { Card, CardBody, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import CreateProjectForms from './components/CreateProjectForms'
import PageMetaData from '@/components/PageTitle'

const CreateProject = () => {
  return (
    <>
      <PageBreadcrumb title="Create Project" subName="Vertex" />
      <PageMetaData title="Create Project" />

      <Row>
        <Col>
          <Card>
            <CardBody>
              <CreateProjectForms />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}
export default CreateProject
