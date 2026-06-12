import GoogleSignInButton from '@/components/auth/GoogleSignInButton'
import { GOOGLE_CLIENT_ID } from '@/config/api'

const ThirdPartyAuth = ({ mode = 'signin' }) => {
  if (!GOOGLE_CLIENT_ID) {
    return null
  }

  return (
    <div className="auth-divider mt-4">
      <span className="auth-divider__label text-muted">or continue with</span>
      <GoogleSignInButton mode={mode} />
    </div>
  )
}

export default ThirdPartyAuth
