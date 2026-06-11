import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import LogoBox from '@/components/LogoBox'
import PageMetaData from '@/components/PageTitle'
import ThirdPartyAuth from '@/components/ThirdPartyAuth'
import LoginForm from './LoginForm'
const SignIn = () => {
  return (
    <>
      <PageMetaData title="Sign In" />

      <Card className="auth-card">
        <CardBody className="auth-card-body px-0">
          <Row className="align-items-center g-0">
            <Col lg={6} className="d-none d-lg-inline-block border-end">
              <div className="auth-page-sidebar">
                <LogoBox
                  textLogo={{
                    height: 200,
                    width: 450,
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
                <h2 className="fw-bold text-center fs-18">Sign In</h2>
                <p className="text-muted text-center mt-1 mb-4">Enter your email address and password to access admin panel.</p>
                <Row className="justify-content-center">
                  <Col xs={12} md={8}>
                    <LoginForm />

                    {/* <ThirdPartyAuth /> */}
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>
      <p className="text-white mb-0 text-center">
        Don&apos;t have an account?
        <Link to="/auth/sign-up" className="text-white fw-bold ms-1">
          Sign Up
        </Link>
      </p>
    </>
  )
}
export default SignIn
