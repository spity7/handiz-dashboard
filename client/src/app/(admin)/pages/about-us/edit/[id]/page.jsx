import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardBody, Col, Row, Spinner } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import { useGlobalContext } from '@/context/useGlobalContext'
import DynamicContentBlocksEditor from '../../components/DynamicContentBlocksEditor'
import useDynamicContentBlocks from '../../hooks/useDynamicContentBlocks'
import { buildContentBlocksFormData, mapContentBlocksFromApi } from '../../utils/contentBlocks'

const EditAboutUs = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getAboutUsById, updateAboutUs } = useGlobalContext()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const { dynamicBlocks, setDynamicBlocks, addBlock, updateBlock, removeBlock, moveBlock } = useDynamicContentBlocks()

  useEffect(() => {
    const fetchAboutUs = async () => {
      try {
        const data = await getAboutUsById(id)
        setDynamicBlocks(mapContentBlocksFromApi(data.contentBlocks))
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
  }

  if (fetching) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" />
      </div>
    )
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
