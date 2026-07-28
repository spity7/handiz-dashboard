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
import useConfirmFormSubmit from '@/hooks/useConfirmFormSubmit'
import useRegisterUnsavedFormDirty from '@/hooks/useRegisterUnsavedFormDirty'
import { buildFormConfirmOptions } from '@/utils/formConfirm'
import { isProfileComplete, instagramUrlSchema, mobileCountryCodeSchema, mobileLocalNumberSchema, splitMobileFields } from '@/utils/profileComplete'
import useGuardedAction from '@/hooks/useGuardedAction'

const accountSchema = yup.object({
  mobileCountryCode: mobileCountryCodeSchema(yup),
  mobileNumber: mobileLocalNumberSchema(yup),
  instagramUrl: instagramUrlSchema(yup),
  avatarUrl: yup
    .string()
    .trim()
    .test('url', 'Enter a valid URL', (v) => !v || /^https?:\/\/.+/i.test(v)),
  bio: yup.string().trim().max(2000, 'Bio cannot exceed 2000 characters'),
  location: yup.string().trim().max(200, 'Location cannot exceed 200 characters'),
  facebookUrl: yup
    .string()
    .trim()
    .test('url', 'Enter a valid URL', (v) => !v || /^https?:\/\/.+/i.test(v)),
  xUrl: yup
    .string()
    .trim()
    .test('url', 'Enter a valid URL', (v) => !v || /^https?:\/\/.+/i.test(v)),
})

const AccountPage = () => {
  const { user, loading, updateProfile } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const redirectFrom = location.state?.from || '/ecommerce/student-projects'
  const profileAlreadyComplete = isProfileComplete(user)
  const confirmFormSubmit = useConfirmFormSubmit()
  const guardAction = useGuardedAction()

  const { control, handleSubmit, reset, watch } = useForm({
    resolver: yupResolver(accountSchema),
    defaultValues: {
      mobileCountryCode: '+961',
      mobileNumber: '',
      instagramUrl: '',
      avatarUrl: '',
      bio: '',
      location: '',
      facebookUrl: '',
      xUrl: '',
    },
  })

  const profileSnapshot = user
    ? {
        mobileCountryCode: splitMobileFields(user).mobileCountryCode || '+961',
        mobileNumber: splitMobileFields(user).mobileNumber || '',
        instagramUrl: user.instagramUrl || '',
        avatarUrl: user.avatarUrl || '',
        bio: user.bio || '',
        location: user.location || '',
        facebookUrl: user.facebookUrl || '',
        xUrl: user.xUrl || '',
      }
    : null

  const formValues = watch()
  useRegisterUnsavedFormDirty(profileSnapshot, formValues, { enabled: Boolean(user) })

  useEffect(() => {
    if (!user) return
    const mobile = splitMobileFields(user)
    reset({
      mobileCountryCode: mobile.mobileCountryCode || '+961',
      mobileNumber: mobile.mobileNumber,
      instagramUrl: user.instagramUrl || '',
      avatarUrl: user.avatarUrl || '',
      bio: user.bio || '',
      location: user.location || '',
      facebookUrl: user.facebookUrl || '',
      xUrl: user.xUrl || '',
    })
  }, [user, reset])

  const onSubmit = async (data) => {
    if (!user?._id) return

    await confirmFormSubmit(buildFormConfirmOptions('save', { subject: 'your account details' }), async () => {
      setIsSubmitting(true)
      try {
        await updateProfile(user._id, {
          mobileCountryCode: data.mobileCountryCode,
          mobileNumber: data.mobileNumber,
          instagramUrl: data.instagramUrl,
          avatarUrl: data.avatarUrl || '',
          bio: data.bio || '',
          location: data.location || '',
          facebookUrl: data.facebookUrl || '',
          xUrl: data.xUrl || '',
        })
        toast.success('Account details saved.')
        navigate(redirectFrom, { replace: true })
      } catch (error) {
        const msg = error?.response?.data?.error || error?.message || 'Failed to save account details.'
        toast.error(msg)
      } finally {
        setIsSubmitting(false)
      }
    })
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
                        <TextFormInput control={control} name="mobileNumber" label="Number" placeholder="Enter your mobile number" type="number" />
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

                  <Col xs={12}>
                    <hr className="my-2" />
                    <h6 className="mb-3">Course instructor profile</h6>
                    <p className="text-muted small">
                      Shown in the &quot;About author&quot; block on course detail pages when you are assigned as instructor.
                    </p>
                  </Col>
                  <Col xs={12}>
                    <TextFormInput control={control} name="avatarUrl" label="Profile photo URL" placeholder="https://…" />
                  </Col>
                  <Col xs={12}>
                    <TextFormInput control={control} name="location" label="Location" placeholder="City, Country" />
                  </Col>
                  <Col xs={12}>
                    <TextFormInput
                      control={control}
                      name="bio"
                      label="Short bio"
                      placeholder="A few sentences about your experience"
                      as="textarea"
                      rows={4}
                    />
                  </Col>
                  <Col md={6}>
                    <TextFormInput control={control} name="facebookUrl" label="Facebook URL" placeholder="https://facebook.com/…" />
                  </Col>
                  <Col md={6}>
                    <TextFormInput control={control} name="xUrl" label="X (Twitter) URL" placeholder="https://x.com/…" />
                  </Col>
                  <Col xs={12} className="d-flex gap-2">
                    <Button type="submit" variant="primary" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : 'Save account details'}
                    </Button>
                    {profileAlreadyComplete && (
                      <Button type="button" variant="light" onClick={() => guardAction(() => navigate(-1))}>
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
