import { Card, CardBody, Col, Placeholder, Row } from 'react-bootstrap'

const FieldSkeleton = ({ tall = false }) => (
  <div className="mb-3">
    <Placeholder as="span" animation="glow" className="project-form-skeleton__label rounded d-block mb-2" />
    <Placeholder as="div" animation="glow" className={tall ? 'project-form-skeleton__editor rounded' : 'project-form-skeleton__input rounded'} />
  </div>
)

const CardSkeleton = ({ children }) => (
  <Card className="mb-3">
    <CardBody>
      <Placeholder as="span" animation="glow" className="project-form-skeleton__label rounded d-block mb-3" style={{ width: 140 }} />
      {children}
    </CardBody>
  </Card>
)

/** Matches the two-column layout of the product form while the product loads. */
const ProductFormSkeleton = () => (
  <div className="project-form-skeleton" aria-busy="true" aria-label="Loading product form">
    <Row>
      <Col lg={8}>
        <CardSkeleton>
          <FieldSkeleton />
          <FieldSkeleton tall />
        </CardSkeleton>
        <CardSkeleton>
          <Row>
            <Col md={6}>
              <FieldSkeleton />
            </Col>
            <Col md={6}>
              <FieldSkeleton />
            </Col>
          </Row>
        </CardSkeleton>
      </Col>
      <Col lg={4}>
        <CardSkeleton>
          <FieldSkeleton />
          <FieldSkeleton />
        </CardSkeleton>
        <CardSkeleton>
          <Placeholder as="div" animation="glow" className="project-form-skeleton__dropzone rounded" />
        </CardSkeleton>
      </Col>
    </Row>
  </div>
)

export default ProductFormSkeleton
