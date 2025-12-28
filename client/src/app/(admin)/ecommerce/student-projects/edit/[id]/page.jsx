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

const EditProject = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getProjectById, updateProject, deleteProjectGalleryImage } = useGlobalContext()

  const [project, setProject] = useState(null)
  const [title, setTitle] = useState('')
  const [student, setStudent] = useState('')
  const [area, setArea] = useState('')
  const [description, setDescription] = useState('')
  const [order, setOrder] = useState(999)
  const [concept, setConcept] = useState([])
  const [category, setCategory] = useState([])
  const [type, setType] = useState([])
  const [year, setYear] = useState([])
  const [location, setLocation] = useState([])
  const [university, setUniversity] = useState([])

  const [thumbnail, setThumbnail] = useState(null)
  const [preview, setPreview] = useState(null)
  const [galleryFiles, setGalleryFiles] = useState([])
  const [existingGallery, setExistingGallery] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const data = await getProjectById(id)
        setProject(data)
        setTitle(data.title)
        setStudent(data.student)
        setArea(data.area)
        setDescription(data.description)

        setOrder(data.order ?? 999)
        setConcept(data.concept || [])
        setType(data.type || [])
        setCategory(data.category || [])
        setYear(data.year || [])
        setLocation(data.location || [])
        setUniversity(data.university || [])

        setPreview(data.thumbnailUrl)
        setExistingGallery(data.gallery || [])
      } catch (error) {
        alert('Failed to load project')
      }
    }
    fetchProject()
  }, [id, getProjectById])

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
      if (
        concept.length === 0 ||
        type.length === 0 ||
        category.length === 0 ||
        year.length === 0 ||
        location.length === 0 ||
        university.length === 0
      ) {
        alert('Please select at least one Concept, Type, Category, Year, Location, and University')
        setLoading(false)
        return
      }

      const formData = new FormData()
      formData.append('title', title)
      formData.append('student', student)
      formData.append('area', area)
      formData.append('description', description)

      formData.append('order', order)

      if (thumbnail) formData.append('thumbnail', thumbnail)
      galleryFiles.forEach((file) => formData.append('gallery', file))

      concept.forEach((c) => formData.append('concept', c))
      type.forEach((t) => formData.append('type', t))
      category.forEach((c) => formData.append('category', c))
      year.forEach((c) => formData.append('year', c))
      location.forEach((c) => formData.append('location', c))
      university.forEach((c) => formData.append('university', c))

      await updateProject(id, formData)
      alert('Project updated successfully!')
      navigate('/ecommerce/student-projects')
    } catch (error) {
      alert(error?.response?.data?.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteOldImage = async (imageUrl) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return

    try {
      const res = await deleteProjectGalleryImage(id, imageUrl)
      alert('Image deleted successfully!')
      setExistingGallery(res.gallery)
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to delete image')
    }
  }

  const toggleCheckbox = (value, state, setState) => {
    setState((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  if (!project)
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" /> <p>Loading...</p>
      </div>
    )

  return (
    <>
      <PageMetaData title="Edit Project" />
      <PageBreadcrumb title="Edit Project" subName="Handiz" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <form onSubmit={handleSubmit}>
                <Row>
                  <Col lg={3}>
                    <div className="mb-3">
                      <label className="form-label">Project Title</label>
                      <input type="text" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    </div>
                  </Col>
                  <Col lg={3}>
                    <div className="mb-3">
                      <label className="form-label">Student</label>
                      <input type="text" className="form-control" value={student} onChange={(e) => setStudent(e.target.value)} required />
                    </div>
                  </Col>
                  <Col lg={3}>
                    <div className="mb-3">
                      <label className="form-label">Area</label>
                      <input type="text" className="form-control" value={area} onChange={(e) => setArea(e.target.value)} required />
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
                    <label className="form-label fw-bold">Concept *</label>
                    {['Sustainability', 'Function', 'Formalism'].map((item) => (
                      <div key={item}>
                        <input type="checkbox" checked={concept.includes(item)} onChange={() => toggleCheckbox(item, concept, setConcept)} /> {item}
                      </div>
                    ))}
                    {concept.length === 0 && <p className="text-danger">Select at least one concept</p>}
                  </Col>

                  <Col lg={3}>
                    <label className="form-label fw-bold">Type *</label>
                    {['Educational', 'Touristic', 'Residential'].map((item) => (
                      <div key={item}>
                        <input type="checkbox" checked={type.includes(item)} onChange={() => toggleCheckbox(item, type, setType)} /> {item}
                      </div>
                    ))}
                    {type.length === 0 && <p className="text-danger">Select at least one type</p>}
                  </Col>

                  <Col lg={3}>
                    <label className="form-label fw-bold">Category *</label>
                    {['Graduated Project', 'UnderGraduated Project', 'Arab Project', 'Competitions Project'].map((item) => (
                      <div key={item}>
                        <input type="checkbox" checked={category.includes(item)} onChange={() => toggleCheckbox(item, category, setCategory)} />{' '}
                        {item}
                      </div>
                    ))}
                    {category.length === 0 && <p className="text-danger">Select at least one category</p>}
                  </Col>

                  <Col lg={3}>
                    <label className="form-label fw-bold">Year *</label>
                    {['2025-2026', '2024-2025', '2023-2024', '2022-2023'].map((item) => (
                      <div key={item}>
                        <input type="checkbox" checked={year.includes(item)} onChange={() => toggleCheckbox(item, year, setYear)} /> {item}
                      </div>
                    ))}
                    {year.length === 0 && <p className="text-danger">Select at least one year</p>}
                  </Col>
                </Row>

                <Row>
                  <Col lg={3}>
                    <label className="form-label fw-bold">Location *</label>
                    {['Lebanon', 'Jordan', 'Iraq'].map((item) => (
                      <div key={item}>
                        <input type="checkbox" checked={location.includes(item)} onChange={() => toggleCheckbox(item, location, setLocation)} />{' '}
                        {item}
                      </div>
                    ))}
                    {location.length === 0 && <p className="text-danger">Select at least one location</p>}
                  </Col>

                  <Col lg={3}>
                    <label className="form-label fw-bold">University *</label>
                    {['Lebaneese uni', 'USJ', 'AUB', 'Alba', 'LAU'].map((item) => (
                      <div key={item}>
                        <input type="checkbox" checked={university.includes(item)} onChange={() => toggleCheckbox(item, university, setUniversity)} />{' '}
                        {item}
                      </div>
                    ))}
                    {university.length === 0 && <p className="text-danger">Select at least one university</p>}
                  </Col>

                  <Col lg={6}>
                    <div className="mb-3">
                      <label className="form-label">Project Thumbnail</label>
                      <input type="file" className="form-control" onChange={handleFileChange} />
                      {preview && (
                        <div className="mt-3">
                          <p className="fw-bold mb-1">Preview:</p>
                          <img src={preview} alt="Project Thumbnail" style={{ width: 80, height: 80, objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>
                  </Col>
                </Row>

                <Row>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <ReactQuill theme="snow" value={description} onChange={setDescription} />
                    </div>
                  </Col>
                </Row>

                <DropzoneFormInput
                  label="Update Project Gallery"
                  labelClassName="fs-14 mb-1 mt-2"
                  iconProps={{
                    icon: 'bx:cloud-upload',
                    height: 36,
                    width: 36,
                  }}
                  text="Upload Gallery Images"
                  showPreview
                  onFileUpload={(files) => setGalleryFiles(files)}
                />

                {existingGallery.length > 0 && (
                  <div className="mb-4">
                    <label className="form-label fw-bold">Existing Gallery</label>
                    <div className="d-flex flex-wrap gap-3">
                      {existingGallery.map((imgUrl, idx) => (
                        <div key={idx} className="position-relative">
                          <img
                            src={imgUrl}
                            alt={`Gallery ${idx}`}
                            style={{
                              width: 100,
                              height: 100,
                              objectFit: 'cover',
                              borderRadius: 6,
                              border: '1px solid #ddd',
                            }}
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            className="position-absolute top-0 end-0 p-1 rounded-circle"
                            onClick={() => handleDeleteOldImage(imgUrl)}>
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Project'}
                </Button>
              </form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default EditProject
