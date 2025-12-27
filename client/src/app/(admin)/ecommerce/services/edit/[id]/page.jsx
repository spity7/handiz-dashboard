import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardBody, Col, Row, Button, Spinner } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import { useGlobalContext } from '@/context/useGlobalContext'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

const EditService = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getServiceById, updateService } = useGlobalContext()
  const [service, setService] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchService = async () => {
      try {
        const data = await getServiceById(id)
        setService(data)
        setName(data.name)
        setDescription(data.description)
        setPreview(data.iconUrl)
      } catch (error) {
        alert('Failed to load service')
      }
    }
    fetchService()
  }, [id, getServiceById])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      setIcon(file)
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result)
      reader.readAsDataURL(file)
    } else {
      setIcon(null)
      alert('Only image files are allowed (e.g., PNG, JPG, SVG, WebP, GIF)')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('name', name)
      formData.append('description', description)
      if (icon) formData.append('icon', icon)

      await updateService(id, formData)
      alert('Service updated successfully!')
      navigate('/ecommerce/services')
    } catch (error) {
      alert(error?.response?.data?.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  if (!service)
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" /> <p>Loading...</p>
      </div>
    )

  return (
    <>
      <PageMetaData title="Edit Service" />
      <PageBreadcrumb title="Edit Service" subName="Vertex" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Service Name</label>
                  <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <ReactQuill theme="snow" value={description} onChange={setDescription} />
                </div>

                <div className="mb-3">
                  <label className="form-label">Service Icon</label>
                  <input type="file" accept="image/*" className="form-control" onChange={handleFileChange} />
                  {preview && (
                    <div className="mt-3">
                      <p className="fw-bold mb-1">Preview:</p>
                      <img src={preview} alt="Service Icon" style={{ width: 80, height: 80, objectFit: 'contain' }} />
                    </div>
                  )}
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Service'}
                </Button>
              </form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default EditService
