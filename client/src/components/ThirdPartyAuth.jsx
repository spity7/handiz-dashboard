import GoogleSignInButton from '@/components/auth/GoogleSignInButton'
import { GOOGLE_CLIENT_ID } from '@/config/api'

const ThirdPartyAuth = ({ mode = 'signin' }) => {
  if (!GOOGLE_CLIENT_ID) {
    return null
  }

  const dividerLabel = mode === 'signup' ? 'or sign up with email' : 'or sign in with email'

  return (
    <div className="auth-divider auth-divider--social-first mb-4">
      <GoogleSignInButton mode={mode} />
      <span className="auth-divider__label">{dividerLabel}</span>
    </div>
  )
}

export default ThirdPartyAuth
