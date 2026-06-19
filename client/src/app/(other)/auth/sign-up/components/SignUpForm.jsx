import PasswordFormInput from '@/components/form/PasswordFormInput'
import TextFormInput from '@/components/form/TextFormInput'
import PasswordStrengthChecklist from '@/components/auth/PasswordStrengthChecklist'
import { yupResolver } from '@hookform/resolvers/yup'
import { useState, useEffect } from 'react'
import { Button, Spinner } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { useAuthContext } from '@/context/useAuthContext'

const passwordRules = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/

const signUpSchema = yup.object({
  firstname: yup.string().required('Please enter your first name'),
  lastname: yup.string().required('Please enter your last name'),
  username: yup.string().required('Please enter your username'),
  email: yup.string().email('Please enter a valid email').required('Please enter your email'),
  password: yup.string().matches(passwordRules, 'Password must meet all requirements below').required('Please enter your password'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
  role: yup.string().default('User'),
})

const SignUpForm = () => {
  const { handleSignup } = useAuthContext()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    upperCase: false,
    lowerCase: false,
    number: false,
    specialChar: false,
  })

  const { control, handleSubmit, watch } = useForm({
    resolver: yupResolver(signUpSchema),
    defaultValues: {
      firstname: '',
      lastname: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'User',
    },
  })

  const password = watch('password') ?? ''
  const confirmPassword = watch('confirmPassword') ?? ''

  useEffect(() => {
    const regexUpperCase = /[A-Z]/
    const regexLowerCase = /[a-z]/
    const regexNumber = /[0-9]/
    const regexSpecialChar = /[!@#$%^&*(),.?":{}|<>]/

    setPasswordCriteria({
      length: password.length >= 8,
      upperCase: regexUpperCase.test(password),
      lowerCase: regexLowerCase.test(password),
      number: regexNumber.test(password),
      specialChar: regexSpecialChar.test(password),
    })
  }, [password])

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    try {
      await handleSignup(data.firstname, data.lastname, data.username, data.email, data.password)
    } catch (error) {
      console.error(error?.message ?? error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const showPasswordStrength = password.length > 0
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

  return (
    <form className="authentication-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="auth-name-row mb-3">
        <TextFormInput control={control} name="firstname" label="First name" id="firstname" placeholder="Jane" autoComplete="given-name" />
        <TextFormInput control={control} name="lastname" label="Last name" id="lastname" placeholder="Doe" autoComplete="family-name" />
      </div>

      <div className="auth-name-row mb-3">
        <TextFormInput control={control} name="username" label="Username" id="username" placeholder="janedoe" autoComplete="username" />
        <TextFormInput control={control} name="email" label="Email" id="email" placeholder="you@example.com" autoComplete="email" />
      </div>

      <div className="auth-name-row mb-2">
        <PasswordFormInput
          control={control}
          name="password"
          placeholder="Create a password"
          id="password"
          label="Password"
          autoComplete="new-password"
        />
        <PasswordFormInput
          control={control}
          name="confirmPassword"
          placeholder="Confirm password"
          id="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
        />
      </div>

      <PasswordStrengthChecklist criteria={passwordCriteria} visible={showPasswordStrength} />

      {passwordsMismatch && <p className="text-danger small mb-3">Passwords do not match.</p>}

      <div className="mb-1 text-center d-grid">
        <Button variant="primary" type="submit" disabled={isSubmitting || passwordsMismatch}>
          {isSubmitting ? (
            <>
              <Spinner animation="border" size="sm" role="status" className="me-2" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </div>
    </form>
  )
}

export default SignUpForm
