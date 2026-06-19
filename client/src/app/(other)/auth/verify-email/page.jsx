import { Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { buildAuthLink } from '@/utils/authRedirect'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import PageMetaData from '@/components/PageTitle'
import AuthPageShell from '@/components/auth/AuthPageShell'

const VerifyEmailCard = () => {
  const navigate = useNavigate()

  const handleLoginRedirect = () => {
    navigate(buildAuthLink('/auth/sign-in'))
  }

  return (
    <>
      <PageMetaData title="Verify Email" />

      <AuthPageShell title="Check your inbox">
        <div className="auth-verify-card">
          <div className="auth-verify-card__icon" aria-hidden="true">
            <IconifyIcon icon="bi:envelope-check" />
          </div>
          <h3 className="auth-verify-card__title">We sent you a verification email</h3>
          <p className="auth-verify-card__text">
            Open the link in your inbox to verify your account. Once verified, you can sign in and start using the dashboard.
          </p>
          <Button variant="primary" className="w-100" onClick={handleLoginRedirect}>
            Back to sign in
          </Button>
        </div>
      </AuthPageShell>
    </>
  )
}

export default VerifyEmailCard
