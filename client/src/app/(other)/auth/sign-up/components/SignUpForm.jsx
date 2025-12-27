import PasswordFormInput from '@/components/form/PasswordFormInput'
import TextFormInput from '@/components/form/TextFormInput'
import { yupResolver } from '@hookform/resolvers/yup'
import { useState, useEffect } from 'react'
import { Button, FormCheck } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { useAuthContext } from '@/context/useAuthContext'

const SignUpForm = () => {
  const { handleSignup } = useAuthContext()

  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    upperCase: false,
    lowerCase: false,
    number: false,
    specialChar: false,
  })
  const [passwordMatch, setPasswordMatch] = useState(false)
  const [allFieldsFilled, setAllFieldsFilled] = useState(false)

  const passwordRules = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/

  const signUpSchema = yup.object({
    firstname: yup.string().required('Please enter your first name'),
    lastname: yup.string().required('Please enter your last name'),
    username: yup.string().required('Please enter your username'),
    email: yup.string().email('Please enter a valid email').required('please enter your email'),
    password: yup
      .string()
      .matches(passwordRules, 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character')
      .required('Please enter your password'),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('password'), null], 'Passwords must match')
      .required('Please confirm your password'),
    role: yup.string().default('User'),
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

  const firstname = watch('firstname') ?? ''
  const lastname = watch('lastname') ?? ''
  const username = watch('username') ?? ''
  const email = watch('email') ?? ''
  const password = watch('password') ?? ''
  const confirmPassword = watch('confirmPassword') ?? ''

  const validatePassword = (password) => {
    const regexUpperCase = /[A-Z]/
    const regexLowerCase = /[a-z]/
    const regexNumber = /[0-9]/
    const regexSpecialChar = /[!@#$%^&*(),.?":{}|<>]/

    const length = password.length >= 8
    const upperCase = regexUpperCase.test(password)
    const lowerCase = regexLowerCase.test(password)
    const number = regexNumber.test(password)
    const specialChar = regexSpecialChar.test(password)

    setPasswordCriteria({
      length,
      upperCase,
      lowerCase,
      number,
      specialChar,
    })
  }

  useEffect(() => {
    validatePassword(password)
    setPasswordMatch(password === confirmPassword || confirmPassword === '')
    const allFields = [firstname, lastname, username, email, password, confirmPassword].every((v) => !!v)
    setAllFieldsFilled(allFields)
  }, [firstname, lastname, username, email, password, confirmPassword])

  const OnHandleSubmit = async (data) => {
    try {
      // data contains: firstname, lastname, username, email, password, confirmPassword, role
      await handleSignup(data.firstname, data.lastname, data.username, data.email, data.password, data.role ?? 'User')
    } catch (error) {
      // keep minimal logging
      console.error(error?.message ?? error)
    }
  }

  return (
    <form className="authentication-form" onSubmit={handleSubmit(OnHandleSubmit)}>
      <TextFormInput control={control} name="firstname" containerClassName="mb-3" label="First Name" id="firstname" placeholder="Enter first name" />
      <TextFormInput control={control} name="lastname" containerClassName="mb-3" label="Last Name" id="lastname" placeholder="Enter last name" />
      <TextFormInput control={control} name="username" containerClassName="mb-3" label="Username" id="username" placeholder="Enter username" />
      <TextFormInput control={control} name="email" containerClassName="mb-3" label="Email" id="email" placeholder="Enter your email" />
      <PasswordFormInput
        control={control}
        name="password"
        containerClassName="mb-3"
        placeholder="Enter your password"
        id="password"
        label="Password"
      />
      <PasswordFormInput
        control={control}
        name="confirmPassword"
        containerClassName="mb-3"
        placeholder="Enter Confirm Password"
        id="confirmPassword"
        label="Confirm Password"
      />
      {/* <div className="mb-3">
        <FormCheck label="I accept Terms and Condition" id="termAndCondition" />
      </div> */}
      <div className="mb-1 text-center d-grid">
        <Button variant="primary" type="submit">
          Sign Up
        </Button>
      </div>
    </form>
  )
}
export default SignUpForm
