import { Card, CardBody, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import CreateProjectForms from './components/CreateProjectForms'
import PageMetaData from '@/components/PageTitle'

const CreateStudentProject = () => {
  return (
    <>
      <PageBreadcrumb title="Create Student Project" subName="Handiz" />
      <PageMetaData title="Create Student Project" />

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
export default CreateStudentProject
