import { Card, CardBody, Col, Placeholder, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import CheckboxGroupSkeleton from './CheckboxGroupSkeleton'

const FormFieldSkeleton = ({ className }) => (
  <div className={`mb-3 ${className || ''}`}>
    <Placeholder as="span" animation="glow" className="project-form-skeleton__label rounded d-block mb-2" />
    <Placeholder as="div" animation="glow" className="project-form-skeleton__input rounded" />
  </div>
)

const CheckboxFieldSkeleton = () => (
  <div className="student-project-field-box mb-2">
    <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
      <Placeholder as="span" animation="glow" className="project-form-skeleton__label rounded" />
      <Placeholder as="span" animation="glow" className="project-form-skeleton__link rounded" />
    </div>
    <CheckboxGroupSkeleton />
  </div>
)

const VertexFormSkeleton = () => (
  <div className="project-form-skeleton placeholder-glow" aria-hidden="true">
    {Array.from({ length: 5 }, (_, index) => (
      <FormFieldSkeleton key={index} />
    ))}
    <div className="mb-3">
      <Placeholder as="span" animation="glow" className="project-form-skeleton__label rounded d-block mb-2" />
      <Placeholder as="div" animation="glow" className="project-form-skeleton__editor rounded" />
    </div>
    <FormFieldSkeleton />
    <div className="mb-4">
      <Placeholder as="span" animation="glow" className="project-form-skeleton__label rounded d-block mb-2" />
      <Placeholder as="div" animation="glow" className="project-form-skeleton__dropzone rounded" />
    </div>
    <div className="mb-4">
      <Placeholder as="span" animation="glow" className="project-form-skeleton__label rounded d-block mb-2" />
      <Placeholder as="div" animation="glow" className="project-form-skeleton__dropzone rounded" />
    </div>
    <Placeholder as="span" animation="glow" className="project-form-skeleton__button rounded" />
  </div>
)

const StudentFormSkeleton = () => (
  <div className="project-form-skeleton" aria-hidden="true">
    <Row className="mb-3">
      {Array.from({ length: 4 }, (_, index) => (
        <Col lg={3} key={index}>
          <FormFieldSkeleton />
        </Col>
      ))}
    </Row>
    <Row className="mb-3">
      {Array.from({ length: 4 }, (_, index) => (
        <Col lg={3} key={index}>
          <CheckboxFieldSkeleton />
        </Col>
      ))}
    </Row>
    <Row className="mb-3">
      {Array.from({ length: 2 }, (_, index) => (
        <Col lg={3} key={index}>
          <CheckboxFieldSkeleton />
        </Col>
      ))}
    </Row>
    <Row className="mb-3 placeholder-glow">
      <Col lg={4}>
        <FormFieldSkeleton />
      </Col>
      <Col lg={4}>
        <FormFieldSkeleton />
      </Col>
      <Col lg={4}>
        <FormFieldSkeleton />
      </Col>
    </Row>
    <div className="mb-3 placeholder-glow">
      <Placeholder as="span" animation="glow" className="project-form-skeleton__label rounded d-block mb-2" />
      <Placeholder as="div" animation="glow" className="project-form-skeleton__editor rounded" />
    </div>
    <Row className="mb-3 placeholder-glow">
      <Col lg={6}>
        <div className="mb-3">
          <Placeholder as="span" animation="glow" className="project-form-skeleton__label rounded d-block mb-2" />
          <Placeholder as="div" animation="glow" className="project-form-skeleton__dropzone rounded" />
        </div>
      </Col>
      <Col lg={6}>
        <div className="mb-3">
          <Placeholder as="span" animation="glow" className="project-form-skeleton__label rounded d-block mb-2" />
          <Placeholder as="div" animation="glow" className="project-form-skeleton__dropzone rounded" />
        </div>
      </Col>
    </Row>
    <Placeholder as="span" animation="glow" className="project-form-skeleton__button rounded" />
  </div>
)

const ProjectFormSkeleton = ({ variant = 'student', title = 'Edit Project', subName = 'Handiz', showLayout = true }) => {
  const form = variant === 'vertex' ? <VertexFormSkeleton /> : <StudentFormSkeleton />

  if (!showLayout) {
    return (
      <div aria-busy="true" aria-label="Loading project form">
        {form}
      </div>
    )
  }

  return (
    <>
      <PageMetaData title={title} />
      <PageBreadcrumb title={title} subName={subName} />
      <Row>
        <Col>
          <Card>
            <CardBody aria-busy="true" aria-label="Loading project form">
              {form}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default ProjectFormSkeleton
