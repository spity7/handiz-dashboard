import { Card, CardBody, Col, Placeholder, Row } from 'react-bootstrap'

const ProductDetailSkeleton = () => (
  <div className="shop-product-detail" aria-busy="true" aria-label="Loading product">
    <Row className="g-3">
      <Col lg={5}>
        <Card>
          <CardBody>
            <Placeholder as="div" animation="glow" className="shop-product-detail__skeleton-main rounded" />
            <div className="d-flex gap-2 mt-3">
              {[0, 1, 2].map((key) => (
                <Placeholder key={key} as="div" animation="glow" className="shop-product-detail__skeleton-thumb rounded" />
              ))}
            </div>
          </CardBody>
        </Card>
      </Col>
      <Col lg={7}>
        <Card className="mb-3">
          <CardBody>
            <Placeholder as="span" animation="glow" className="rounded d-inline-block mb-3" style={{ width: 120, height: 24 }} />
            <Placeholder as="h4" animation="glow" className="rounded col-8 mb-2" />
            <Placeholder as="p" animation="glow" className="rounded col-5 mb-3" />
            <Placeholder as="p" animation="glow" className="rounded col-10" />
          </CardBody>
        </Card>
        <Row className="g-3 mb-3">
          {[0, 1, 2].map((key) => (
            <Col sm={4} key={key}>
              <Card>
                <CardBody>
                  <Placeholder as="div" animation="glow" className="rounded mb-2" style={{ width: 64, height: 16 }} />
                  <Placeholder as="div" animation="glow" className="rounded" style={{ width: '50%', height: 28 }} />
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>
        <Card>
          <CardBody>
            <Placeholder as="h5" animation="glow" className="rounded col-4 mb-3" />
            <Placeholder as="div" animation="glow" className="rounded col-12 mb-2" />
            <Placeholder as="div" animation="glow" className="rounded col-11 mb-2" />
            <Placeholder as="div" animation="glow" className="rounded col-9" />
          </CardBody>
        </Card>
      </Col>
    </Row>
  </div>
)

export default ProductDetailSkeleton
