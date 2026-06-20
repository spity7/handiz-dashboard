import { Card, CardBody, Col, Placeholder, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'

const ContentBlocksFormSkeleton = ({ title = 'About Us', subName = 'Pages', showLayout = true }) => {
  const form = (
    <div className="content-blocks-form-skeleton placeholder-glow" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="mb-4 p-3 border rounded">
          <Placeholder as="span" animation="glow" className="content-blocks-form-skeleton__label rounded d-block mb-3" />
          <Placeholder as="div" animation="glow" className="content-blocks-form-skeleton__editor rounded mb-2" />
          <Placeholder as="div" animation="glow" className="content-blocks-form-skeleton__line rounded" style={{ width: '82%' }} />
        </div>
      ))}
      <Placeholder as="span" animation="glow" className="content-blocks-form-skeleton__button rounded" />
    </div>
  )

  if (!showLayout) {
    return (
      <div aria-busy="true" aria-label="Loading form">
        {form}
      </div>
    )
  }

  return (
    <>
      <PageMetaData title={title} />
      <PageBreadcrumb subName={subName} title={title} />
      <Row>
        <Col>
          <Card>
            <CardBody aria-busy="true" aria-label="Loading form">
              {form}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default ContentBlocksFormSkeleton
