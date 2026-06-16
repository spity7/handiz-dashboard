import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import FallbackLoading from '@/components/FallbackLoading'
import { captureAuthRedirectFromSearch, redirectAfterAuth } from '@/utils/authRedirect'

const AuthenticatedAuthRedirect = ({ fallback = '/' }) => {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    captureAuthRedirectFromSearch(searchParams)
    redirectAfterAuth(fallback)
  }, [fallback, searchParams])

  return <FallbackLoading />
}

export default AuthenticatedAuthRedirect
