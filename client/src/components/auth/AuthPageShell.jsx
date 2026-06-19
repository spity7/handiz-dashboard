import { Card, CardBody } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import LogoBox from '@/components/LogoBox'

const AuthPageShell = ({ title, subtitle, children, footerText, footerLinkText, footerLinkTo, size = 'default' }) => {
  const shellClass =
    size === 'wide' ? 'auth-page-shell auth-page-shell--wide' : size === 'medium' ? 'auth-page-shell auth-page-shell--medium' : 'auth-page-shell'

  return (
    <div className={shellClass}>
      <div className="auth-page-logo">
        <LogoBox
          textLogo={{
            height: 130,
            width: 473,
          }}
          containerClassName="text-center auth-logo"
        />
      </div>

      <Card className="auth-card">
        <CardBody className="auth-card-body p-0">
          <div className="auth-form-panel">
            <h2 className="auth-form-title">{title}</h2>
            {subtitle && <p className="auth-form-subtitle">{subtitle}</p>}
            <div className="auth-form-content">{children}</div>
          </div>
        </CardBody>
      </Card>

      {footerText && footerLinkText && footerLinkTo && (
        <p className="auth-footer text-center mb-0">
          {footerText}
          <Link to={footerLinkTo} className="auth-footer-link ms-1">
            {footerLinkText}
          </Link>
        </p>
      )}
    </div>
  )
}

export default AuthPageShell
