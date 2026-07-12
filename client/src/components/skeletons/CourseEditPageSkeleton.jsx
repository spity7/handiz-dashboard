import { Card, CardBody, Col, Placeholder, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'

const StatCardSkeleton = () => (
  <Col md={3}>
    <Card>
      <CardBody className="placeholder-glow">
        <Placeholder as="span" animation="glow" className="course-edit-skeleton__stat-label rounded d-block mb-2" />
        <Placeholder as="span" animation="glow" className="course-edit-skeleton__stat-value rounded" />
      </CardBody>
    </Card>
  </Col>
)

const CourseEditPageSkeleton = ({ title = 'Edit Course' }) => (
  <>
    <PageMetaData title={title} />
    <PageBreadcrumb title={title} subName="Course Editor" />

    <Row className="mb-3 placeholder-glow" aria-busy="true" aria-label="Loading course editor">
      {Array.from({ length: 4 }, (_, index) => (
        <StatCardSkeleton key={index} />
      ))}
    </Row>

    <Card className="mb-4">
      <CardBody className="placeholder-glow">
        <Placeholder as="span" animation="glow" className="course-edit-skeleton__section-title rounded d-block mb-3" />
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="mb-3">
            <Placeholder as="span" animation="glow" className="course-edit-skeleton__label rounded d-block mb-2" />
            <Placeholder as="div" animation="glow" className="course-edit-skeleton__input rounded" />
          </div>
        ))}
        <Placeholder as="div" animation="glow" className="course-edit-skeleton__editor rounded mb-3" />
        <Placeholder as="span" animation="glow" className="course-edit-skeleton__button rounded" />
      </CardBody>
    </Card>

    <Card className="course-curriculum-card mb-4">
      <CardBody className="course-curriculum-card__body placeholder-glow">
        <div className="course-curriculum-header mb-3">
          <Placeholder as="span" animation="glow" className="course-edit-skeleton__section-title rounded d-block mb-2" />
          <Placeholder as="span" animation="glow" className="course-edit-skeleton__meta rounded d-block" />
        </div>
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="course-edit-skeleton__module rounded mb-2" />
        ))}
      </CardBody>
    </Card>
  </>
)

export default CourseEditPageSkeleton
