import { Suspense, useEffect } from 'react'
import { Container } from 'react-bootstrap'
import { useSearchParams } from 'react-router-dom'
import Preloader from '@/components/Preloader'
import { captureAuthRedirectFromSearch } from '@/utils/authRedirect'

const AuthLayout = ({ children }) => {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    captureAuthRedirectFromSearch(searchParams)
  }, [searchParams])

  return (
    <div className="authentication-bg">
      <div className="account-pages">
        <Container>
          <Suspense fallback={<Preloader />}>{children}</Suspense>
        </Container>
      </div>
    </div>
  )
}

export default AuthLayout
