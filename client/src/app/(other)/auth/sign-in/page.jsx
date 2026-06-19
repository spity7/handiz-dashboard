import { useSearchParams } from 'react-router-dom'
import { buildAuthLink } from '@/utils/authRedirect'
import PageMetaData from '@/components/PageTitle'
import ThirdPartyAuth from '@/components/ThirdPartyAuth'
import AuthPageShell from '@/components/auth/AuthPageShell'
import LoginForm from './LoginForm'

const SignIn = () => {
  const [searchParams] = useSearchParams()
  const signUpLink = buildAuthLink('/auth/sign-up', searchParams)

  return (
    <>
      <PageMetaData title="Sign In" />

      <AuthPageShell
        size="medium"
        title="Sign in"
        subtitle="Enter your email or username and password to access the dashboard."
        footerText="Don't have an account?"
        footerLinkText="Sign up"
        footerLinkTo={signUpLink}>
        <ThirdPartyAuth />
        <LoginForm />
      </AuthPageShell>
    </>
  )
}

export default SignIn
