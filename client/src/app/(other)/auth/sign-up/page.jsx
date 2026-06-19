import { useSearchParams } from 'react-router-dom'
import { buildAuthLink } from '@/utils/authRedirect'
import PageMetaData from '@/components/PageTitle'
import ThirdPartyAuth from '@/components/ThirdPartyAuth'
import AuthPageShell from '@/components/auth/AuthPageShell'
import SignUpForm from './components/SignUpForm'

const SignUp = () => {
  const [searchParams] = useSearchParams()
  const signInLink = buildAuthLink('/auth/sign-in', searchParams)

  return (
    <>
      <PageMetaData title="Sign Up" />

      <AuthPageShell
        size="wide"
        title="Create account"
        subtitle="Join Handiz to get started. It only takes a minute."
        footerText="Already have an account?"
        footerLinkText="Sign in"
        footerLinkTo={signInLink}>
        <ThirdPartyAuth mode="signup" />
        <SignUpForm />
      </AuthPageShell>
    </>
  )
}

export default SignUp
