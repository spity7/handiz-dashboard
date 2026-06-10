import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardBody, Col, Row, Spinner } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import { useGlobalContext } from '@/context/useGlobalContext'
import DynamicContentBlocksEditor from '../components/DynamicContentBlocksEditor'
import useDynamicContentBlocks from '../hooks/useDynamicContentBlocks'
import { buildContentBlocksFormData } from '../utils/contentBlocks'

const CreateAboutUs = () => {
  const navigate = useNavigate()
  const { createAboutUs, getAboutUs } = useGlobalContext()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const { dynamicBlocks, addBlock, updateBlock, removeBlock, moveBlock } = useDynamicContentBlocks()

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
  }

  if (checking) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" />
      </div>
    )
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
