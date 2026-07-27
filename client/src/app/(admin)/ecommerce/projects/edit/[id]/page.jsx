import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardBody, Col, Row, Button } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import ProjectFormSkeleton from '@/components/skeletons/ProjectFormSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import ReactQuill from 'react-quill'
import DropzoneFormInput from '@/components/form/DropzoneFormInput'
import { THUMBNAIL_ACCEPT_STRING, readThumbnailInput } from '@/utils/imageFile'
import SelectFormInput from '@/components/form/SelectFormInput'
import { renameKeys } from '@/utils/rename-object-keys'
import 'react-quill/dist/quill.snow.css'
import { getAllProjectCategories } from '@/helpers/data'
import useConfirmFormSubmit from '@/hooks/useConfirmFormSubmit'
import { buildFormConfirmOptions } from '@/utils/formConfirm'
import useRegisterUnsavedFormDirty from '@/hooks/useRegisterUnsavedFormDirty'

const EditProject = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const confirmFormSubmit = useConfirmFormSubmit()
  const { getProjectById, updateProject, deleteProjectGalleryImage } = useGlobalContext()

  const [project, setProject] = useState(null)
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [order, setOrder] = useState(999)
  const [thumbnail, setThumbnail] = useState(null)
  const [preview, setPreview] = useState(null)
  const [galleryFiles, setGalleryFiles] = useState([])
  const [existingGallery, setExistingGallery] = useState([])
  const [projectCategories, setProjectCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [loading, setLoading] = useState(false)

  // ✅ Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getAllProjectCategories()
        if (!data) return
        const options = data.map((category) =>
          renameKeys(category, {
            id: 'value',
            name: 'label',
          }),
        )
        setProjectCategories(options)
      } finally {
        setCategoriesLoading(false)
      }
    }
    fetchCategories()
  }, [])

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const data = await getProjectById(id)
        setProject(data)
        setName(data.name)
        setTitle(data.title)
        setDescription(data.description)

        // ✅ Find matching option by label (since API gives category name)
        const matchedCategory = projectCategories.find((cat) => cat.label === data.category)
        setCategory(matchedCategory ? matchedCategory.value : '')

        setLocation(data.location)
        setOrder(data.order ?? 999)
        setPreview(data.thumbnailUrl)
        setExistingGallery(data.gallery || [])
      } catch (error) {
        alert('Failed to load project')
      }
    }
    // ✅ wait until categories are loaded
    if (projectCategories.length > 0) fetchProject()
  }, [id, getProjectById, projectCategories])

  const projectFormSnapshot =
    project && projectCategories.length > 0
      ? {
          name: project.name,
          title: project.title,
          description: project.description,
          category: projectCategories.find((cat) => cat.label === project.category)?.value ?? '',
          location: project.location,
          order: project.order ?? 999,
          gallery: project.gallery || [],
        }
      : null

  const projectFormCurrent = {
    name,
    title,
    description,
    category,
    location,
    order,
    gallery: existingGallery,
  }

  useRegisterUnsavedFormDirty(projectFormSnapshot, projectFormCurrent, {
    enabled: Boolean(project),
    extraDirty: Boolean(thumbnail) || galleryFiles.length > 0,
  })

  const handleFileChange = (e) => {
    readThumbnailInput(e, {
      onValid: (file) => {
        setThumbnail(file)
        const reader = new FileReader()
        reader.onload = () => setPreview(reader.result)
        reader.readAsDataURL(file)
      },
      onClear: () => {
        setThumbnail(null)
      },
      onInvalid: (message) => alert(message),
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await confirmFormSubmit(buildFormConfirmOptions('update', { subject: 'this project' }), async () => {
      try {
        setLoading(true)
        const formData = new FormData()
        formData.append('name', name)
        formData.append('title', title)
        formData.append('description', description)

        // ✅ Convert selected category value -> label (to match backend)
        const selectedCategory = projectCategories.find((cat) => cat.value === category)
        const categoryName = selectedCategory ? selectedCategory.label : category
        formData.append('category', categoryName)

        formData.append('location', location)
        formData.append('order', order)

        if (thumbnail) formData.append('thumbnail', thumbnail)
        galleryFiles.forEach((file) => formData.append('gallery', file))

        await updateProject(id, formData)
        alert('Project updated successfully!')
        navigate('/ecommerce/projects')
      } catch (error) {
        alert(error?.response?.data?.message || 'Update failed')
      } finally {
        setLoading(false)
      }
    })
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

  if (!project || categoriesLoading) return <ProjectFormSkeleton variant="standard" title="Edit Project" subName="Handiz" />

  return (
    <>
      <PageMetaData title="Edit Project" />
      <PageBreadcrumb title="Edit Project" subName="Handiz" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Project Name</label>
                  <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div className="mb-3">
                  <label className="form-label">Project Title</label>
                  <input type="text" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>

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

                {/* ✅ Replace input with dropdown */}
                <div className="mb-3">
                  <label className="form-label">Category</label>
                  <SelectFormInput name="category" options={projectCategories} value={category} onChange={(val) => setCategory(val)} />
                </div>

                <div className="mb-3">
                  <label className="form-label">Location</label>
                  <input type="text" className="form-control" value={location} onChange={(e) => setLocation(e.target.value)} required />
                </div>

                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <ReactQuill theme="snow" value={description} onChange={setDescription} />
                </div>

                <div className="mb-3">
                  <label className="form-label">Project Thumbnail</label>
                  <input type="file" className="form-control" accept={THUMBNAIL_ACCEPT_STRING} onChange={handleFileChange} />
                  {preview && (
                    <div className="mt-3">
                      <p className="fw-bold mb-1">Preview:</p>
                      <img src={preview} alt="Project Thumbnail" style={{ width: 80, height: 80, objectFit: 'contain' }} />
                    </div>
                  )}
                </div>

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
