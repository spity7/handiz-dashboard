import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import FallbackLoading from '@/components/FallbackLoading'
import { captureAuthRedirectFromSearch, redirectAfterAuth } from '@/utils/authRedirect'

const AuthenticatedAuthRedirect = ({ fallback = '/' }) => {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    captureAuthRedirectFromSearch(searchParams)
    const timer = setTimeout(() => redirectAfterAuth(fallback), 1200)
    return () => clearTimeout(timer)
  }, [fallback, searchParams])

  return <FallbackLoading />
}

export default AuthenticatedAuthRedirect
