import TextFormInput from '@/components/form/TextFormInput'
import { yupResolver } from '@hookform/resolvers/yup'
import { useState } from 'react'
import { Alert, Button, Spinner } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'

const resetPasswordSchema = yup.object({
  email: yup.string().email('Please enter a valid email').required('Please enter your email'),
})

const ResetPassForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const { control, handleSubmit } = useForm({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Placeholder until reset endpoint is wired
      await new Promise((resolve) => setTimeout(resolve, 600))
      setSubmitted(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Alert variant="success" className="text-start mb-0">
        If an account exists for that email, you&apos;ll receive reset instructions shortly. Check your inbox and spam folder.
      </Alert>
    )
  }

  return (
    <form className="authentication-form" onSubmit={handleSubmit(onSubmit)}>
      <TextFormInput
        control={control}
        name="email"
        containerClassName="mb-3"
        label="Email"
        id="email-id"
        placeholder="you@example.com"
        autoComplete="email"
      />
      <div className="mb-1 text-center d-grid">
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner animation="border" size="sm" role="status" className="me-2" />
              Sending...
            </>
          ) : (
            'Send reset link'
          )}
        </Button>
      </div>
    </form>
  )
}

export default ResetPassForm
