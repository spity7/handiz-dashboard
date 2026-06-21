import { useEffect, useState } from 'react'
import { Alert, Button, Card, CardBody, Col, Form, Row, Spinner } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useLocation, useNavigate } from 'react-router-dom'
import * as yup from 'yup'
import { toast } from 'react-toastify'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import TextFormInput from '@/components/form/TextFormInput'
import { useAuthContext } from '@/context/useAuthContext'
import { isProfileComplete, instagramUrlSchema, mobileCountryCodeSchema, mobileLocalNumberSchema, splitMobileFields } from '@/utils/profileComplete'

const accountSchema = yup.object({
  mobileCountryCode: mobileCountryCodeSchema(yup),
  mobileNumber: mobileLocalNumberSchema(yup),
  instagramUrl: instagramUrlSchema(yup),
})

const AccountPage = () => {
  const { user, loading, updateProfile } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const redirectFrom = location.state?.from || '/ecommerce/student-projects'
  const profileAlreadyComplete = isProfileComplete(user)

  const { control, handleSubmit, reset } = useForm({
    resolver: yupResolver(accountSchema),
    defaultValues: {
      mobileCountryCode: '',
      mobileNumber: '',
      instagramUrl: '',
    },
  })

  useEffect(() => {
    if (!user) return
    const mobile = splitMobileFields(user)
    reset({
      mobileCountryCode: mobile.mobileCountryCode,
      mobileNumber: mobile.mobileNumber,
      instagramUrl: user.instagramUrl || '',
    })
  }, [user, reset])

  const onSubmit = async (data) => {
    if (!user?._id) return

    setIsSubmitting(true)
    try {
      await updateProfile(user._id, {
        mobileCountryCode: data.mobileCountryCode,
        mobileNumber: data.mobileNumber,
        instagramUrl: data.instagramUrl,
      })
      toast.success('Account details saved.')
      navigate(redirectFrom, { replace: true })
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || 'Failed to save account details.'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" role="status" />
      </div>
    )
  }

  return (
    <>
      <PageMetaData title="Account" />
      <PageBreadcrumb title="Account" subName="Settings" />

      <Row className="justify-content-center">
        <Col lg={8} xl={6}>
          <Card>
            <CardBody>
              {!profileAlreadyComplete && (
                <Alert variant="warning" className="mb-4">
                  Add your mobile number and Instagram URL before you can create or edit student projects.
                </Alert>
              )}

              <div className="mb-4">
                <h5 className="mb-1">
                  {user?.firstname} {user?.lastname}
                </h5>
                <p className="text-muted mb-0 small">@{user?.username}</p>
                <p className="text-muted mb-0 small">{user?.email}</p>
              </div>

              <Form onSubmit={handleSubmit(onSubmit)}>
                <Row className="g-3">
                  <Col xs={12}>
                    <Form.Label>Mobile number</Form.Label>
                    <Row className="g-2">
                      <Col sm={4}>
                        <TextFormInput control={control} name="mobileCountryCode" label="Code" placeholder="+961" />
                      </Col>
                      <Col sm={8}>
                        <TextFormInput control={control} name="mobileNumber" label="Number" placeholder="70123456" />
                      </Col>
                    </Row>
                    <Form.Text className="text-muted">Country code (e.g. 961) and local number (4–12 digits).</Form.Text>
                  </Col>
                  <Col xs={12}>
                    <TextFormInput
                      control={control}
                      name="instagramUrl"
                      label="Instagram"
                      placeholder="@yourhandle or https://instagram.com/yourhandle"
                    />
                  </Col>
                  <Col xs={12} className="d-flex gap-2">
                    <Button type="submit" variant="primary" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : 'Save account details'}
                    </Button>
                    {profileAlreadyComplete && (
                      <Button type="button" variant="light" onClick={() => navigate(-1)}>
                        Cancel
                      </Button>
                    )}
                  </Col>
                </Row>
              </Form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default AccountPage
