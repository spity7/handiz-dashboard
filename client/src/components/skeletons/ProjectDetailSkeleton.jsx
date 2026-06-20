import { Card, CardBody, Col, Placeholder, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'

const ProjectDetailSkeleton = ({ title = 'Product Details', subName = 'Ecommerce' }) => (
  <>
    <PageBreadcrumb title={title} subName={subName} />
    <PageMetaData title={title} />
    <Row>
      <Col>
        <Card>
          <CardBody className="project-detail-skeleton" aria-busy="true" aria-label="Loading project details">
            <Row>
              <Col lg={4}>
                <Placeholder as="div" animation="glow" className="project-detail-skeleton__hero rounded mb-3" />
                <div className="d-flex gap-2 placeholder-glow">
                  {Array.from({ length: 4 }, (_, index) => (
                    <Placeholder key={index} as="span" animation="glow" className="project-detail-skeleton__thumb rounded" />
                  ))}
                </div>
              </Col>
              <Col lg={8} className="placeholder-glow">
                <Placeholder as="h1" animation="glow" className="project-detail-skeleton__title rounded mb-3" />
                <Placeholder xs={8} className="mb-2" />
                <Placeholder xs={6} className="mb-4" />
                <Placeholder xs={12} className="mb-2" />
                <Placeholder xs={11} className="mb-2" />
                <Placeholder xs={10} className="mb-2" />
                <Placeholder xs={9} className="mb-4" />
                <div className="d-flex gap-2 flex-wrap">
                  {Array.from({ length: 3 }, (_, index) => (
                    <Placeholder key={index} as="span" animation="glow" className="project-detail-skeleton__chip rounded-pill" />
                  ))}
                </div>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Col>
    </Row>
  </>
)

export default ProjectDetailSkeleton
