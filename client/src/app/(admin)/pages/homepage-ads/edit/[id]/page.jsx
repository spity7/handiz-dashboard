import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardBody, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ProjectFormSkeleton from '@/components/skeletons/ProjectFormSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import useConfirmFormSubmit from '@/hooks/useConfirmFormSubmit'
import { buildFormConfirmOptions } from '@/utils/formConfirm'
import useRegisterUnsavedFormDirty from '@/hooks/useRegisterUnsavedFormDirty'
import { HomepageAdFormFields, appendHomepageAdFormData, homepageAdToFormValues } from '../../components/HomepageAdFormFields'

const apiErrorMessage = (error, fallback) => {
  const data = error?.response?.data
  if (data == null) return error?.message || fallback
  if (typeof data === 'string') return data.trim() || fallback
  if (typeof data.message === 'string') return data.message
  return fallback
}

const HomepageAdsEditPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const confirmFormSubmit = useConfirmFormSubmit()
  const { getHomepageAdById, updateHomepageAd } = useGlobalContext()

  const [initialSnapshot, setInitialSnapshot] = useState(null)
  const [values, setValues] = useState(null)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState(null)
  const [resetDropzones, setResetDropzones] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const ad = await getHomepageAdById(id)
        const formValues = homepageAdToFormValues(ad)
        setValues(formValues)
        setInitialSnapshot(formValues)
        setThumbnailPreview(ad.thumbnailUrl)
      } catch (error) {
        alert(apiErrorMessage(error, 'Could not load this ad'))
        navigate('/pages/homepage-ads')
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [getHomepageAdById, id, navigate])

  useRegisterUnsavedFormDirty(initialSnapshot, values, { extraDirty: Boolean(thumbnailFile) })

  const onThumbnailChange = (file) => {
    setThumbnailFile(file)
    if (file) {
      setThumbnailPreview(URL.createObjectURL(file))
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!values) return

    await confirmFormSubmit(buildFormConfirmOptions('update', { subject: 'this homepage ad' }), async () => {
      try {
        setLoading(true)
        const formData = new FormData()
        appendHomepageAdFormData(formData, values)
        if (thumbnailFile) {
          formData.append('thumbnail', thumbnailFile)
        }
        await updateHomepageAd(id, formData)
        alert('Homepage ad updated successfully')
        setInitialSnapshot(values)
        setThumbnailFile(null)
        setResetDropzones(true)
        setTimeout(() => setResetDropzones(false), 0)
      } catch (error) {
        alert(apiErrorMessage(error, 'Failed to update homepage ad'))
      } finally {
        setLoading(false)
      }
    })
  }

  if (fetching || !values) {
    return (
      <>
        <PageMetaData title="Edit Homepage Ad" />
        <PageBreadcrumb title="Edit Homepage Ad" subName="Homepage Ads" />
        <ProjectFormSkeleton variant="standard" />
      </>
    )
  }

  return (
    <>
      <PageMetaData title="Edit Homepage Ad" />
      <PageBreadcrumb title="Edit Homepage Ad" subName="Homepage Ads" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <form onSubmit={onSubmit}>
                <HomepageAdFormFields
                  values={values}
                  onChange={setValues}
                  thumbnailFile={thumbnailFile}
                  onThumbnailChange={onThumbnailChange}
                  thumbnailPreviewUrl={thumbnailPreview}
                  resetDropzones={resetDropzones}
                  isEdit
                />
                <div className="d-flex gap-2 mt-3">
                  <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button type="button" variant="light" onClick={() => navigate('/pages/homepage-ads')}>
                    Back to list
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default HomepageAdsEditPage
