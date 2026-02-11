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

const EditOffice = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getOfficeById, updateOffice } = useGlobalContext()

  const [office, setOffice] = useState(null)
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [locationMap, setLocationMap] = useState('')
  const [email, setEmail] = useState('')
  const [instagram, setInstagram] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [order, setOrder] = useState(999)
  const [teamNb, setTeamNb] = useState(0)
  const [category, setCategory] = useState([])
  const [status, setStatus] = useState([])

  const [thumbnail, setThumbnail] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchOffice = async () => {
      try {
        const data = await getOfficeById(id)
        setOffice(data)
        setTitle(data.title)
        setLocation(data.location)
        setLocationMap(data.locationMap)
        setEmail(data.email)
        setInstagram(data.instagram)
        setLinkedin(data.linkedin)

        setOrder(data.order ?? 999)
        setTeamNb(data.teamNb ?? 0)
        setCategory(data.category || [])
        setStatus(data.status || [])
        setPreview(data.thumbnailUrl)
      } catch (error) {
        alert('Failed to load office')
      }
    }
    fetchOffice()
  }, [id, getOfficeById])

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
      if (category.length === 0) {
        alert('Please select at least one  Category')
        setLoading(false)
        return
      }
      if (status.length === 0) {
        alert('Please select at least one  Status')
        setLoading(false)
        return
      }

      const formData = new FormData()
      formData.append('title', title)
      formData.append('location', location)
      formData.append('locationMap', locationMap)
      formData.append('email', email)
      formData.append('instagram', instagram)
      formData.append('linkedin', linkedin)

      formData.append('order', order)
      formData.append('teamNb', teamNb)

      if (thumbnail) formData.append('thumbnail', thumbnail)

      category.forEach((c) => formData.append('category', c))
      status.forEach((s) => formData.append('status', s))

      await updateOffice(id, formData)
      alert('Office updated successfully!')
      navigate('/ecommerce/offices')
    } catch (error) {
      alert(error?.response?.data?.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const toggleCheckbox = (value, state, setState) => {
    setState((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  if (!office)
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" /> <p>Loading...</p>
      </div>
    )

  return (
    <>
      <PageMetaData title="Edit Office" />
      <PageBreadcrumb title="Edit Office" subName="Handiz" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <form onSubmit={handleSubmit}>
                <Row>
                  <Col lg={3}>
                    <div className="mb-3">
                      <label className="form-label">Office Title</label>
                      <input type="text" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    </div>
                  </Col>
                  <Col lg={3}>
                    <div className="mb-3">
                      <label className="form-label">Location</label>
                      <input type="text" className="form-control" value={location} onChange={(e) => setLocation(e.target.value)} required />
                    </div>
                  </Col>
                  <Col lg={3}>
                    <div className="mb-3">
                      <label className="form-label">Location Map</label>
                      <input type="text" className="form-control" value={locationMap} onChange={(e) => setLocationMap(e.target.value)} required />
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

                <Row className="mb-3">
                  <Col lg={3}>
                    <div className="mb-3">
                      <label className="form-label">Instagram</label>
                      <input type="text" className="form-control" value={instagram} onChange={(e) => setInstagram(e.target.value)} required />
                    </div>
                  </Col>
                  <Col lg={3}>
                    <div className="mb-3">
                      <label className="form-label">Linkedin</label>
                      <input type="text" className="form-control" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} required />
                    </div>
                  </Col>

                  <Col lg={3}>
                    <div className="mb-3">
                      <label className="form-label">Email</label>
                      <input type="text" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                  </Col>

                  <Col lg={3}>
                    <div className="mb-3">
                      <label className="form-label">TeamNb</label>
                      <input
                        type="number"
                        className="form-control"
                        value={teamNb}
                        onChange={(e) => setTeamNb(Number(e.target.value))}
                        placeholder="Enter TeamNb"
                        required
                      />
                    </div>
                  </Col>
                </Row>

                <Row>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label className="form-label">Office Thumbnail</label>
                      <input type="file" className="form-control" onChange={handleFileChange} />
                      {preview && (
                        <div className="mt-3">
                          <p className="fw-bold mb-1">Preview:</p>
                          <img src={preview} alt="Office Thumbnail" style={{ width: 80, height: 80, objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>
                  </Col>

                  <Col lg={3}>
                    <label className="form-label fw-bold">Category *</label>
                    {['Architecture', 'Real Estate', 'Technologies', 'Health Lifestyle', 'AI', 'Documentaries'].map((item) => (
                      <div key={item}>
                        <input type="checkbox" checked={category.includes(item)} onChange={() => toggleCheckbox(item, category, setCategory)} />{' '}
                        {item}
                      </div>
                    ))}
                    {category.length === 0 && <p className="text-danger">Select at least one category</p>}
                  </Col>

                  <Col lg={3}>
                    <label className="form-label fw-bold">Status *</label>
                    {['Hiring', 'Not Hiring'].map((item) => (
                      <div key={item}>
                        <input type="checkbox" checked={status.includes(item)} onChange={() => toggleCheckbox(item, status, setStatus)} /> {item}
                      </div>
                    ))}
                    {status.length === 0 && <p className="text-danger">Select at least one status</p>}
                  </Col>
                </Row>

                <Button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Office'}
                </Button>
              </form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default EditOffice
