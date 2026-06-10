import { Link } from 'react-router-dom'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'

const UnauthorizedPage = () => (
  <>
    <PageMetaData title="Unauthorized" />
    <Row className="justify-content-center">
      <Col md={8} lg={6}>
        <Card>
          <CardBody className="text-center p-5">
            <h3 className="mb-3">Access denied</h3>
            <p className="text-muted mb-4">You do not have permission to view this page.</p>
            <Link to="/ecommerce/student-projects" className="btn btn-primary">
              Go to Student Projects
            </Link>
          </CardBody>
        </Card>
      </Col>
    </Row>
  </>
)

export default UnauthorizedPage
