import { Link, useSearchParams } from 'react-router-dom'
import { buildAuthLink } from '@/utils/authRedirect'
import PageMetaData from '@/components/PageTitle'
import AuthPageShell from '@/components/auth/AuthPageShell'
import ResetPassForm from './components/ResetPassForm'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const signInLink = buildAuthLink('/auth/sign-in', searchParams)

  return (
    <>
      <PageMetaData title="Reset Password" />

      <AuthPageShell title="Reset password" subtitle="Enter your email address and we'll send you instructions to reset your password.">
        <ResetPassForm />
      </AuthPageShell>

      <p className="auth-footer text-center mb-0">
        Back to
        <Link to={signInLink} className="auth-footer-link ms-1">
          Sign in
        </Link>
      </p>
    </>
  )
}

export default ResetPassword
