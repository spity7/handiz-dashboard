import * as yup from 'yup'
import PasswordFormInput from '@/components/form/PasswordFormInput'
import TextFormInput from '@/components/form/TextFormInput'
import { Button, Spinner } from 'react-bootstrap'
import { useAuthContext } from '@/context/useAuthContext'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'

export const loginSchema = yup.object({
  emailOrUsername: yup.string().required('Please enter your email or username'),
  password: yup.string().required('Please enter your password'),
})

const LoginForm = () => {
  const { handleLogin } = useAuthContext()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { control, handleSubmit } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      emailOrUsername: '',
      password: '',
    },
  })

  const onSubmit = async (data) => {
    const { emailOrUsername, password } = data

    setIsSubmitting(true)
    try {
      await handleLogin(emailOrUsername, password)
    } catch (error) {
      console.error(error?.message ?? error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="authentication-form">
      <TextFormInput
        control={control}
        name="emailOrUsername"
        containerClassName="mb-3"
        label="Email or username"
        id="emailOrUsername"
        placeholder="you@example.com"
        autoComplete="username"
      />

      <PasswordFormInput
        control={control}
        name="password"
        containerClassName="mb-3"
        placeholder="Enter your password"
        id="password"
        label="Password"
        autoComplete="current-password"
      />

      <div className="mb-1 text-center d-grid">
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner animation="border" size="sm" role="status" className="me-2" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </div>
    </form>
  )
}

export default LoginForm
