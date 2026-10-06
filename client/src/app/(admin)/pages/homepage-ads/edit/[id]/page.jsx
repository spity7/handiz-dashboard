import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardBody, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ProjectFormSkeleton from '@/components/skeletons/ProjectFormSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import { useLmsAsyncBusy } from '@/context/LmsAsyncBusyContext'
import useConfirmFormSubmit from '@/hooks/useConfirmFormSubmit'
import { buildFormConfirmOptions } from '@/utils/formConfirm'
import useRegisterUnsavedFormDirty from '@/hooks/useRegisterUnsavedFormDirty'
import { useUnsavedFormChanges } from '@/context/UnsavedFormChangesContext'
import Swal from 'sweetalert2'
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
  const { acknowledgeSuccessfulFormSave } = useUnsavedFormChanges()
  const { getHomepageAdById, updateHomepageAd } = useGlobalContext()

  const [initialSnapshot, setInitialSnapshot] = useState(null)
  const [values, setValues] = useState(null)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState(null)
  const [resetDropzones, setResetDropzones] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  useLmsAsyncBusy(loading)

  useEffect(() => {
    const load = async () => {
      try {
        const ad = await getHomepageAdById(id)
        const formValues = homepageAdToFormValues(ad)
        setValues(formValues)
        setInitialSnapshot(formValues)
        setThumbnailPreview(ad.thumbnailUrl)
      } catch (error) {
        await Swal.fire('Error', apiErrorMessage(error, 'Could not load this ad'), 'error')
        navigate('/pages/homepage-ads')
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [getHomepageAdById, id, navigate])

  const { isDirty: hasChanges } = useRegisterUnsavedFormDirty(initialSnapshot, values, {
    extraDirty: Boolean(thumbnailFile),
  })

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
        setInitialSnapshot(values)
        setThumbnailFile(null)
        setResetDropzones(true)
        setTimeout(() => setResetDropzones(false), 0)
        acknowledgeSuccessfulFormSave()
      } catch (error) {
        await Swal.fire('Error', apiErrorMessage(error, 'Failed to update homepage ad'), 'error')
        return
      } finally {
        setLoading(false)
      }

      await Swal.fire('Saved', 'Homepage ad updated successfully.', 'success')
      navigate('/pages/homepage-ads')
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
                <fieldset disabled={loading} style={{ border: 'none', margin: 0, padding: 0 }}>
                  <HomepageAdFormFields
                    values={values}
                    onChange={setValues}
                    thumbnailFile={thumbnailFile}
                    onThumbnailChange={onThumbnailChange}
                    thumbnailPreviewUrl={thumbnailPreview}
                    resetDropzones={resetDropzones}
                    isEdit
                  />
                </fieldset>
                <div className="d-flex gap-2 mt-3">
                  <Button type="submit" variant="primary" disabled={loading || !hasChanges}>
                    {loading ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button type="button" variant="light" disabled={loading} onClick={() => navigate('/pages/homepage-ads')}>
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
