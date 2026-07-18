import { useState, useRef, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Spinner } from 'react-bootstrap'
import { useAuthContext } from '@/context/useAuthContext'
import { GOOGLE_CLIENT_ID } from '@/config/api'
import { ensureGoogleIdentityInitialized, loadGoogleIdentityScript } from '@/utils/googleIdentity'

const GoogleLogo = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" className="google-signin-btn__icon">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

const GoogleSignInButton = ({ mode = 'signin' }) => {
  const { handleGoogleLogin } = useAuthContext()
  const [isLoading, setIsLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [buttonWidth, setButtonWidth] = useState(0)
  const wrapperRef = useRef(null)
  const overlayRef = useRef(null)
  const buttonRenderedRef = useRef(false)
  const onSuccessRef = useRef(null)
  const onErrorRef = useRef(null)

  const actionLabel = mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'
  const buttonText = mode === 'signup' ? 'signup_with' : 'signin_with'

  onSuccessRef.current = async (credentialResponse) => {
    if (!credentialResponse?.credential) return

    setIsLoading(true)
    try {
      await handleGoogleLogin(credentialResponse.credential)
    } finally {
      setIsLoading(false)
    }
  }

  onErrorRef.current = () => {
    setIsLoading(false)
    toast.error('Google sign in failed. Check that this site is listed in Google Cloud Console under Authorized JavaScript origins.')
  }

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return

    let active = true

    loadGoogleIdentityScript()
      .then(() => {
        if (active) setScriptLoaded(true)
      })
      .catch(() => {
        if (active) {
          toast.error('Failed to load Google Sign-In. Please refresh and try again.')
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el || !scriptLoaded) return

    const measureWidth = () => {
      const nextWidth = el.offsetWidth
      if (nextWidth > 0) {
        setButtonWidth((prev) => (prev === nextWidth ? prev : nextWidth))
      }
    }

    measureWidth()

    const observer = new ResizeObserver(measureWidth)
    observer.observe(el)
    return () => observer.disconnect()
  }, [scriptLoaded])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !scriptLoaded || buttonWidth <= 0 || buttonRenderedRef.current) {
      return
    }

    const container = overlayRef.current
    if (!container) return

    ensureGoogleIdentityInitialized(GOOGLE_CLIENT_ID, (credentialResponse) => {
      if (!credentialResponse?.credential) {
        onErrorRef.current?.()
        return
      }

      onSuccessRef.current?.(credentialResponse)
    })

    window.google.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      width: buttonWidth,
      text: buttonText,
      shape: 'rectangular',
    })

    buttonRenderedRef.current = true
  }, [scriptLoaded, buttonWidth, buttonText])

  if (!GOOGLE_CLIENT_ID) {
    return null
  }

  return (
    <div className={`google-signin${scriptLoaded ? '' : ' google-signin--pending'}`}>
      <div ref={wrapperRef} className="google-signin-btn-wrapper">
        <div
          className={`google-signin-btn${isLoading ? ' is-loading' : ''}${!scriptLoaded ? ' is-pending' : ''}`}
          aria-busy={isLoading || !scriptLoaded}
          aria-disabled={!scriptLoaded}>
          {isLoading ? (
            <>
              <Spinner animation="border" size="sm" role="status" className="google-signin-btn__spinner" />
              <span>Connecting to Google...</span>
            </>
          ) : !scriptLoaded ? (
            <>
              <span className="google-signin-btn__shimmer" aria-hidden="true" />
              <span className="google-signin-btn__pending-text">Loading Google Sign-In...</span>
            </>
          ) : (
            <>
              <GoogleLogo />
              <span className="google-signin-btn__label">{actionLabel}</span>
            </>
          )}
        </div>

        {scriptLoaded && buttonWidth > 0 && (
          <div
            ref={overlayRef}
            className={`google-signin-overlay${isLoading ? ' google-signin-overlay--disabled' : ''}`}
            role="presentation"
            aria-hidden={isLoading}
          />
        )}
      </div>
    </div>
  )
}

export default GoogleSignInButton
