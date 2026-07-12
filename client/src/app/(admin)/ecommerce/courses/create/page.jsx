import { Card, CardBody, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import CourseForm from '../components/CourseForm'

const CreateCourse = () => {
  return (
    <>
      <PageMetaData title="Create Course" />
      <PageBreadcrumb title="Create Course" subName="LMS" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <CourseForm />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default CreateCourse
