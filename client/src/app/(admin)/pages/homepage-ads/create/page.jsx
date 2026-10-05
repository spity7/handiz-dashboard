import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardBody, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import { useGlobalContext } from '@/context/useGlobalContext'
import { useLmsAsyncBusy } from '@/context/LmsAsyncBusyContext'
import useConfirmFormSubmit from '@/hooks/useConfirmFormSubmit'
import { buildFormConfirmOptions } from '@/utils/formConfirm'
import { HomepageAdFormFields, appendHomepageAdFormData, emptyHomepageAdFormValues } from '../components/HomepageAdFormFields'

const apiErrorMessage = (error, fallback) => {
  const data = error?.response?.data
  if (data == null) return error?.message || fallback
  if (typeof data === 'string') return data.trim() || fallback
  if (typeof data.message === 'string') return data.message
  return fallback
}

const HomepageAdsCreatePage = () => {
  const navigate = useNavigate()
  const confirmFormSubmit = useConfirmFormSubmit()
  const { createHomepageAd } = useGlobalContext()
  const [values, setValues] = useState(emptyHomepageAdFormValues)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  useLmsAsyncBusy(loading)

  const onThumbnailChange = (file) => {
    setThumbnailFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setThumbnailPreview(url)
    } else {
      setThumbnailPreview(null)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!thumbnailFile) {
      alert('Thumbnail image is required')
      return
    }

    await confirmFormSubmit(buildFormConfirmOptions('create', { subject: 'this homepage ad' }), async () => {
      try {
        setLoading(true)
        const formData = new FormData()
        appendHomepageAdFormData(formData, values)
        formData.append('thumbnail', thumbnailFile)
        const result = await createHomepageAd(formData)
        const id = result?.homepageAd?._id
        if (id) {
          navigate(`/pages/homepage-ads/edit/${id}`)
        } else {
          navigate('/pages/homepage-ads')
        }
      } catch (error) {
        alert(apiErrorMessage(error, 'Failed to create homepage ad'))
      } finally {
        setLoading(false)
      }
    })
  }

  return (
    <>
      <PageMetaData title="Create Homepage Ad" />
      <PageBreadcrumb title="Create Homepage Ad" subName="Homepage Ads" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <form onSubmit={onSubmit}>
                <fieldset disabled={loading} style={{ border: 'none', margin: 0, padding: 0 }}>
                  <HomepageAdFormFields
                    values={values}
                    onChange={setValues}
                    thumbnailFile={thumbnailFile}
                    onThumbnailChange={onThumbnailChange}
                    thumbnailPreviewUrl={thumbnailPreview}
                    resetDropzones={false}
                    isEdit={false}
                  />
                </fieldset>
                <div className="d-flex gap-2 mt-3">
                  <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? 'Saving…' : 'Create ad'}
                  </Button>
                  <Button type="button" variant="light" disabled={loading} onClick={() => navigate('/pages/homepage-ads')}>
                    Cancel
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

export default HomepageAdsCreatePage
