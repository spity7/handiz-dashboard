import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardBody, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ContentBlocksFormSkeleton from '@/components/skeletons/ContentBlocksFormSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import DynamicContentBlocksEditor from '../../components/DynamicContentBlocksEditor'
import useDynamicContentBlocks from '../../hooks/useDynamicContentBlocks'
import { buildContentBlocksFormData, mapContentBlocksFromApi, serializeContentBlocksForCompare } from '../../utils/contentBlocks'
import useConfirmFormSubmit from '@/hooks/useConfirmFormSubmit'
import { buildFormConfirmOptions } from '@/utils/formConfirm'
import useRegisterUnsavedFormDirty from '@/hooks/useRegisterUnsavedFormDirty'

const EditAboutUs = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getAboutUsById, updateAboutUs } = useGlobalContext()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [loadedBlocksSnapshot, setLoadedBlocksSnapshot] = useState(null)
  const { dynamicBlocks, setDynamicBlocks, addBlock, updateBlock, removeBlock, moveBlock } = useDynamicContentBlocks()
  const confirmFormSubmit = useConfirmFormSubmit()

  const blocksSnapshot = useMemo(
    () => (loadedBlocksSnapshot ? { blocks: serializeContentBlocksForCompare(loadedBlocksSnapshot) } : null),
    [loadedBlocksSnapshot],
  )
  const blocksCurrent = useMemo(() => ({ blocks: serializeContentBlocksForCompare(dynamicBlocks) }), [dynamicBlocks])
  useRegisterUnsavedFormDirty(blocksSnapshot, blocksCurrent, { enabled: Boolean(loadedBlocksSnapshot) })

  useEffect(() => {
    const fetchAboutUs = async () => {
      try {
        const data = await getAboutUsById(id)
        const blocks = mapContentBlocksFromApi(data.contentBlocks)
        setLoadedBlocksSnapshot(blocks)
        setDynamicBlocks(blocks)
      } catch (error) {
        alert('Failed to load About Us page')
      } finally {
        setFetching(false)
      }
    }
    fetchAboutUs()
  }, [id, getAboutUsById, setDynamicBlocks])

  const handleSubmit = async (e) => {
    e.preventDefault()

    await confirmFormSubmit(buildFormConfirmOptions('update', { subject: 'the About Us page' }), async () => {
      try {
        setLoading(true)
        const formData = buildContentBlocksFormData(dynamicBlocks)
        await updateAboutUs(id, formData)
        alert('About Us page updated successfully!')
      } catch (error) {
        alert(error?.response?.data?.message || 'Update failed')
      } finally {
        setLoading(false)
      }
    })
  }

  if (fetching) {
    return <ContentBlocksFormSkeleton title="Edit About Us" subName="Pages" />
  }

  return (
    <>
      <PageMetaData title="Edit About Us" />
      <PageBreadcrumb subName="Pages" title="Edit About Us" />
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
                  {loading ? 'Saving...' : 'Save About Us'}
                </Button>
              </form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default EditAboutUs
