import { Link } from 'react-router-dom'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import LogoBox from '@/components/LogoBox'
import PageMetaData from '@/components/PageTitle'
import ResetPassForm from './components/ResetPassForm'
const ResetPassword = () => {
  return (
    <>
      <PageMetaData title="Reset Password" />

      <Card className="auth-card">
        <CardBody className="auth-card-body px-0">
          <Row className="align-items-center g-0">
            <Col lg={6} className="d-none d-lg-inline-block border-end">
              <div className="auth-page-sidebar">
                <LogoBox
                  textLogo={{
                    height: 80,
                    width: 120,
                  }}
                  squareLogo={{
                    className: 'me-1',
                  }}
                  containerClassName="text-center auth-logo"
                />
              </div>
            </Col>
            <Col lg={6}>
              <div className="px-4 py-5">
                <h2 className="fw-bold text-center fs-18">Reset Password</h2>
                <p className="text-muted text-center mt-1 mb-4">
                  Enter your email address and we&apos;ll send you an email with instructions to reset your password.
                </p>
                <Row className="justify-content-center">
                  <Col xs={12} md={8}>
                    <ResetPassForm />
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>
      <p className="text-white mb-0 text-center">
        Back to
        <Link to="/auth/sign-in" className="text-white fw-bold ms-1">
          Sign In
        </Link>
      </p>
    </>
  )
}
export default ResetPassword
