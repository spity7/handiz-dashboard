import { Link } from 'react-router-dom'
import * as yup from 'yup'
import PasswordFormInput from '@/components/form/PasswordFormInput'
import TextFormInput from '@/components/form/TextFormInput'
import { Button } from 'react-bootstrap'
import useSignIn from './useSignIn'
import { useAuthContext } from '@/context/useAuthContext'
import { useForm } from 'react-hook-form'
import { useState, useEffect } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'

export const loginSchema = yup.object({
  emailOrUsername: yup.string().required('please enter your email'),
  password: yup.string().required('Please enter your password'),
})

const LoginForm = () => {
  const { handleLogin } = useAuthContext()

  const [allFieldsFilled, setAllFieldsFilled] = useState(false)

  const { loading, control, handleSubmit, watch } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      emailOrUsername: '',
      password: '',
    },
  })

  const emailOrUsername = watch('emailOrUsername') ?? ''
  const password = watch('password') ?? ''

  useEffect(() => {
    const allFields = [emailOrUsername, password].every((v) => !!v)
    setAllFieldsFilled(allFields)
  }, [emailOrUsername, password])

  const OnHandleSubmit = async (data) => {
    const { emailOrUsername, password } = data

    try {
      const loginIdentifier = emailOrUsername.includes('@') ? 'email' : 'username'
      console.log(`Attempting login with ${loginIdentifier}: ${emailOrUsername}`)

      await handleLogin(emailOrUsername, password)
    } catch (error) {
      // keep minimal logging
      console.error(error?.message ?? error)
    }
  }

  return (
    <form onSubmit={handleSubmit(OnHandleSubmit)} className="authentication-form">
      <TextFormInput
        control={control}
        name="emailOrUsername"
        containerClassName="mb-3"
        label="Email or Username"
        id="emailOrUsername"
        placeholder="Enter your email or username"
      />

      <PasswordFormInput
        control={control}
        name="password"
        containerClassName="mb-3"
        placeholder="Enter your password"
        id="password"
        label={
          <>
            {/* <Link to="/auth/reset-pass" className="float-end text-muted text-unline-dashed ms-1">
              Reset password
            </Link> */}
            <label className="form-label" htmlFor="example-password">
              Password
            </label>
          </>
        }
      />

      {/* <div className="mb-3">
        <div className="form-check">
          <input type="checkbox" className="form-check-input" id="checkbox-signin" />
          <label className="form-check-label" htmlFor="checkbox-signin">
            Remember me
          </label>
        </div>
      </div> */}
      <div className="mb-1 text-center d-grid">
        <Button variant="primary" type="submit" disabled={loading}>
          Sign In
        </Button>
      </div>
    </form>
  )
}
export default LoginForm
