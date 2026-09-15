import { useState } from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import { useLmsAsyncBusy } from '@/context/LmsAsyncBusyContext'
import CourseForm from '../components/CourseForm'

const CreateCourse = () => {
  const [formBusy, setFormBusy] = useState(false)
  useLmsAsyncBusy(formBusy)

  return (
    <>
      <PageMetaData title="Create Course" />
      <PageBreadcrumb title="Create Course" subName="LMS" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <CourseForm onBusyChange={setFormBusy} />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default CreateCourse
