import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardBody, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ContentBlocksFormSkeleton from '@/components/skeletons/ContentBlocksFormSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import DynamicContentBlocksEditor from '../components/DynamicContentBlocksEditor'
import useDynamicContentBlocks from '../hooks/useDynamicContentBlocks'
import { buildContentBlocksFormData, serializeContentBlocksForCompare } from '../utils/contentBlocks'
import useConfirmFormSubmit from '@/hooks/useConfirmFormSubmit'
import { buildFormConfirmOptions } from '@/utils/formConfirm'
import useRegisterUnsavedFormDirty from '@/hooks/useRegisterUnsavedFormDirty'

const ABOUT_US_BLOCKS_DEFAULTS = { blocks: [] }

const CreateAboutUs = () => {
  const navigate = useNavigate()
  const { createAboutUs, getAboutUs } = useGlobalContext()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const { dynamicBlocks, addBlock, updateBlock, removeBlock, moveBlock } = useDynamicContentBlocks()
  const confirmFormSubmit = useConfirmFormSubmit()

  const blocksCurrent = useMemo(() => ({ blocks: serializeContentBlocksForCompare(dynamicBlocks) }), [dynamicBlocks])
  useRegisterUnsavedFormDirty(ABOUT_US_BLOCKS_DEFAULTS, blocksCurrent, { trackingMode: 'defaults' })

  useEffect(() => {
    const ensureCanCreate = async () => {
      try {
        const aboutUs = await getAboutUs()
        if (aboutUs) {
          navigate(`/pages/about-us/edit/${aboutUs._id}`, { replace: true })
        }
      } catch (error) {
        console.error('Error checking About Us page:', error)
      } finally {
        setChecking(false)
      }
    }
    ensureCanCreate()
  }, [getAboutUs, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()

    await confirmFormSubmit(buildFormConfirmOptions('create', { subject: 'the About Us page' }), async () => {
      try {
        setLoading(true)
        const formData = buildContentBlocksFormData(dynamicBlocks)
        const result = await createAboutUs(formData)
        alert('About Us page created successfully!')
        navigate(`/pages/about-us/edit/${result.aboutUs._id}`, { replace: true })
      } catch (error) {
        alert(error?.response?.data?.message || 'Create failed')
      } finally {
        setLoading(false)
      }
    })
  }

  if (checking) {
    return <ContentBlocksFormSkeleton title="Create About Us" subName="Pages" />
  }

  return (
    <>
      <PageMetaData title="Create About Us" />
      <PageBreadcrumb subName="Pages" title="Create About Us" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <form onSubmit={handleSubmit}>
                <DynamicContentBlocksEditor
                  blocks={dynamicBlocks}
                  onAddBlock={addBlock}
                  onUpdateBlock={updateBlock}
                  onRemoveBlock={removeBlock}
                  onMoveBlock={moveBlock}
                />
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create About Us'}
                </Button>
              </form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default CreateAboutUs
