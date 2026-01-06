import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardBody, Col, Row, Button, Spinner } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import { useGlobalContext } from '@/context/useGlobalContext'
import ReactQuill from 'react-quill'
import DropzoneFormInput from '@/components/form/DropzoneFormInput'
import SelectFormInput from '@/components/form/SelectFormInput'
import { renameKeys } from '@/utils/rename-object-keys'
import 'react-quill/dist/quill.snow.css'

const EditAiTool = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getAiToolById, updateAiTool, deleteAiToolGalleryImage } = useGlobalContext()

  const [aiTool, setAiTool] = useState(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [link, setLink] = useState('')
  const [order, setOrder] = useState(999)

  const [thumbnail, setThumbnail] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchAiTool = async () => {
      try {
        const data = await getAiToolById(id)
        setAiTool(data)
        setTitle(data.title)
        setCategory(data.category)
        setLink(data.link)
        setOrder(data.order ?? 999)

        setPreview(data.thumbnailUrl)
      } catch (error) {
        alert('Failed to load aiTool')
      }
    }
    fetchAiTool()
  }, [id, getAiToolById])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setThumbnail(file)
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result)
      reader.readAsDataURL(file)
    } else {
      setThumbnail(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)

      const formData = new FormData()
      formData.append('title', title)
      formData.append('category', category)
      formData.append('link', link)
      formData.append('order', order)

      if (thumbnail) formData.append('thumbnail', thumbnail)

      await updateAiTool(id, formData)
      alert('AiTool updated successfully!')
      navigate('/ecommerce/aiTools')
    } catch (error) {
      alert(error?.response?.data?.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteOldImage = async (imageUrl) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return

    try {
      const res = await deleteAiToolGalleryImage(id, imageUrl)
      alert('Image deleted successfully!')
      setExistingGallery(res.gallery)
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to delete image')
    }
  }

  const toggleCheckbox = (value, state, setState) => {
    setState((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  if (!aiTool)
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" /> <p>Loading...</p>
      </div>
    )

  return (
    <>
      <PageMetaData title="Edit AiTool" />
      <PageBreadcrumb title="Edit AiTool" subName="Handiz" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <form onSubmit={handleSubmit}>
                <Row>
                  <Col lg={3}>
                    <div className="mb-3">
                      <label className="form-label">AiTool Title</label>
                      <input type="text" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    </div>
                  </Col>
                  <Col lg={3}>
                    <div className="mb-3">
                      <label className="form-label">Category</label>
                      <input type="text" className="form-control" value={category} onChange={(e) => setCategory(e.target.value)} required />
                    </div>
                  </Col>
                  <Col lg={3}>
                    <div className="mb-3">
                      <label className="form-label">Link</label>
                      <input type="text" className="form-control" value={link} onChange={(e) => setLink(e.target.value)} required />
                    </div>
                  </Col>
                  <Col lg={3}>
                    <div className="mb-3">
                      <label className="form-label">Order</label>
                      <input
                        type="number"
                        className="form-control"
                        value={order}
                        onChange={(e) => setOrder(Number(e.target.value))}
                        placeholder="Enter Order"
                        required
                      />
                    </div>
                  </Col>
                </Row>

                <Row>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label className="form-label">AiTool Thumbnail</label>
                      <input type="file" className="form-control" onChange={handleFileChange} />
                      {preview && (
                        <div className="mt-3">
                          <p className="fw-bold mb-1">Preview:</p>
                          <img src={preview} alt="AiTool Thumbnail" style={{ width: 80, height: 80, objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>
                  </Col>
                </Row>

                <Button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update AiTool'}
                </Button>
              </form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default EditAiTool
