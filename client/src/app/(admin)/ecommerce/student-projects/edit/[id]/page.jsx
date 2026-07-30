import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardBody, Col, Row, Button } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import ProjectFormSkeleton from '@/components/skeletons/ProjectFormSkeleton'
import CheckboxGroupSkeleton from '@/components/skeletons/CheckboxGroupSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import { useAuthContext } from '@/context/useAuthContext'
import useConfirmAction from '@/hooks/useConfirmAction'
import { ROLES, PROJECT_STATUS } from '@/constants/roles'
import Swal from 'sweetalert2'
import ReactQuill from 'react-quill'
import DropzoneFormInput from '@/components/form/DropzoneFormInput'
import { THUMBNAIL_ACCEPT_STRING, readThumbnailInput } from '@/utils/imageFile'
import SelectFormInput from '@/components/form/SelectFormInput'
import StudentProjectFieldManageLink from '../../components/StudentProjectFieldManageLink'
import RequireProfileComplete from '@/components/auth/RequireProfileComplete'
import { sortOthersLast } from '@/utils/sortOthersLast'
import { renameKeys } from '@/utils/rename-object-keys'
import { PROJECT_IMAGE_UPLOAD_HELP_TEXT, formatProjectUploadErrors, validateProjectUploadFiles } from '@/utils/projectUploadLimits'
import 'react-quill/dist/quill.snow.css'
import useRegisterUnsavedFormDirty from '@/hooks/useRegisterUnsavedFormDirty'

const serializeContentBlocks = (blocks) =>
  (blocks || []).map((block) => ({
    type: block.type,
    content: typeof block.content === 'string' ? block.content : block.content ? '__file__' : '',
  }))

const EditProject = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    getProjectById,
    updateProject,
    deleteProjectGalleryImage,
    getStudentProjectConcepts,
    getStudentProjectTypes,
    getStudentProjectCategories,
    getStudentProjectYears,
    getStudentProjectLocations,
    getStudentProjectUniversities,
  } = useGlobalContext()
  const { user } = useAuthContext()
  const confirmAction = useConfirmAction()

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
  const [googleMapUrl, setGoogleMapUrl] = useState('')
  const [thesisUrl, setThesisUrl] = useState('')
  const [fileUrl, setFileUrl] = useState('')

  const [thumbnail, setThumbnail] = useState(null)
  const [preview, setPreview] = useState(null)
  const [galleryFiles, setGalleryFiles] = useState([])
  const [existingGallery, setExistingGallery] = useState([])
  const [loading, setLoading] = useState(false)
  const [dynamicBlocks, setDynamicBlocks] = useState([])
  const [concepts, setConcepts] = useState([])
  const [conceptsLoading, setConceptsLoading] = useState(true)
  const [types, setTypes] = useState([])
  const [typesLoading, setTypesLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [years, setYears] = useState([])
  const [yearsLoading, setYearsLoading] = useState(true)
  const [locations, setLocations] = useState([])
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [universities, setUniversities] = useState([])
  const [universitiesLoading, setUniversitiesLoading] = useState(true)
  const [loadedSnapshot, setLoadedSnapshot] = useState(null)

  const addBlock = (type) => {
    setDynamicBlocks((prev) => [
      ...prev,
      { id: Date.now() + Math.random().toString(36), type, content: '' }, // content will be text or File
    ])
  }

  const updateBlock = (id, value) => {
    setDynamicBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content: value } : b)))
  }

  const removeBlock = (id) => {
    setDynamicBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  const moveBlock = (index, delta) => {
    setDynamicBlocks((prev) => {
      const j = index + delta
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  }

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
        setGoogleMapUrl(data.googleMapUrl || '')
        setThesisUrl(data.thesisUrl || '')
        setFileUrl(data.fileUrl || '')

        setPreview(data.thumbnailUrl)
        setExistingGallery(data.gallery || [])

        if (data.contentBlocks) {
          setDynamicBlocks(
            data.contentBlocks.map((block) => ({
              ...block,
              id: Date.now() + Math.random().toString(36),
            })),
          )
        }

        setLoadedSnapshot({
          title: data.title,
          student: data.student,
          area: data.area,
          description: data.description,
          order: data.order ?? 999,
          concept: data.concept || [],
          category: data.category || [],
          type: data.type || [],
          year: data.year || [],
          location: data.location || [],
          university: data.university || [],
          googleMapUrl: data.googleMapUrl || '',
          thesisUrl: data.thesisUrl || '',
          fileUrl: data.fileUrl || '',
          contentBlocks: serializeContentBlocks(data.contentBlocks),
          gallery: data.gallery || [],
        })
      } catch (error) {
        alert('Failed to load project')
      }
    }
    const fetchConcepts = async () => {
      try {
        const data = await getStudentProjectConcepts()
        setConcepts(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error fetching concepts:', error)
        setConcepts([])
      } finally {
        setConceptsLoading(false)
      }
    }
    const fetchTypes = async () => {
      try {
        const data = await getStudentProjectTypes()
        setTypes(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error fetching types:', error)
        setTypes([])
      } finally {
        setTypesLoading(false)
      }
    }
    const fetchCategories = async () => {
      try {
        const data = await getStudentProjectCategories()
        setCategories(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error fetching categories:', error)
        setCategories([])
      } finally {
        setCategoriesLoading(false)
      }
    }
    const fetchYears = async () => {
      try {
        const data = await getStudentProjectYears()
        setYears(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error fetching years:', error)
        setYears([])
      } finally {
        setYearsLoading(false)
      }
    }
    const fetchLocations = async () => {
      try {
        const data = await getStudentProjectLocations()
        setLocations(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error fetching locations:', error)
        setLocations([])
      } finally {
        setLocationsLoading(false)
      }
    }
    const fetchUniversities = async () => {
      try {
        const data = await getStudentProjectUniversities()
        setUniversities(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error fetching universities:', error)
        setUniversities([])
      } finally {
        setUniversitiesLoading(false)
      }
    }
    fetchProject()
    fetchConcepts()
    fetchTypes()
    fetchCategories()
    fetchYears()
    fetchLocations()
    fetchUniversities()
  }, [
    id,
    getProjectById,
    getStudentProjectConcepts,
    getStudentProjectTypes,
    getStudentProjectCategories,
    getStudentProjectYears,
    getStudentProjectLocations,
    getStudentProjectUniversities,
  ])

  const currentSnapshot = {
    title,
    student,
    area,
    description,
    order,
    concept,
    category,
    type,
    year,
    location,
    university,
    googleMapUrl,
    thesisUrl,
    fileUrl,
    contentBlocks: serializeContentBlocks(dynamicBlocks),
    gallery: existingGallery,
  }

  useRegisterUnsavedFormDirty(loadedSnapshot, currentSnapshot, {
    enabled: Boolean(loadedSnapshot),
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
      onClear: () => setThumbnail(null),
      onInvalid: (message) => Swal.fire('Validation', message, 'warning'),
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const saveProject = async () => {
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

        const checkOptionalUrl = (val) => {
          const t = (val || '').trim()
          if (!t) return true
          try {
            const u = new URL(t)
            return u.protocol === 'http:' || u.protocol === 'https:'
          } catch {
            return false
          }
        }
        if (!checkOptionalUrl(googleMapUrl)) {
          alert('Google Map must be a valid http(s) URL')
          setLoading(false)
          return
        }
        if (!checkOptionalUrl(thesisUrl)) {
          alert('Thesis must be a valid http(s) URL')
          setLoading(false)
          return
        }
        if (!checkOptionalUrl(fileUrl)) {
          alert('File must be a valid http(s) URL')
          setLoading(false)
          return
        }

        const blockImageFiles = dynamicBlocks.filter((block) => block.type === 'image' && block.content instanceof File).map((block) => block.content)

        const uploadErrors = validateProjectUploadFiles({
          thumbnail,
          gallery: galleryFiles,
          blockImages: blockImageFiles,
        })

        if (uploadErrors.length > 0) {
          Swal.fire('Upload too large', formatProjectUploadErrors(uploadErrors), 'warning')
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
        formData.append('googleMapUrl', (googleMapUrl || '').trim())
        formData.append('thesisUrl', (thesisUrl || '').trim())
        formData.append('fileUrl', (fileUrl || '').trim())

        // ✅ Process dynamic blocks
        const blocksPayload = []
        let imageIndex = 0

        dynamicBlocks.forEach((block) => {
          if (block.type === 'image') {
            // If content is a File object, it's a NEW image
            if (block.content instanceof File) {
              formData.append('blockImages', block.content)
              blocksPayload.push({
                type: 'image',
                fileIndex: imageIndex++,
              })
            } else {
              // It's an existing image URL or empty
              blocksPayload.push({
                type: 'image',
                content: block.content,
              })
            }
          } else {
            blocksPayload.push({
              type: block.type,
              content: block.content,
            })
          }
        })
        formData.append('contentBlocks', JSON.stringify(blocksPayload))

        await updateProject(id, formData)
        await Swal.fire('Saved', 'Project updated successfully.', 'success')
        navigate('/')
      } catch (error) {
        Swal.fire('Error', error?.response?.data?.message || 'Update failed', 'error')
      } finally {
        setLoading(false)
      }
    }

    const needsReReview = user?.role === ROLES.USER

    await confirmAction({
      title: 'Save changes?',
      text: needsReReview ? 'Saving will set this project to Pending for Admin/Editor review.' : 'Update this student project?',
      confirmLabel: 'Save',
      onConfirm: saveProject,
    })
  }

  const handleDeleteOldImage = async (imageUrl) => {
    await confirmAction({
      title: 'Delete gallery image?',
      text: 'This image will be removed from the project.',
      confirmLabel: 'Delete',
      variant: 'danger',
      icon: 'warning',
      onConfirm: async () => {
        try {
          const res = await deleteProjectGalleryImage(id, imageUrl)
          await Swal.fire('Deleted', 'Image deleted successfully.', 'success')
          setExistingGallery(res.gallery)
        } catch (error) {
          Swal.fire('Error', error?.response?.data?.message || 'Failed to delete image', 'error')
        }
      },
    })
  }

  const toggleCheckbox = (value, state, setState) => {
    setState((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  if (!project) {
    return (
      <RequireProfileComplete>
        <ProjectFormSkeleton variant="student" title="Edit Project" subName="Handiz" />
      </RequireProfileComplete>
    )
  }

  return (
    <RequireProfileComplete>
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
                  <Col lg={3} className="student-project-field-box mb-2">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
                      <label className="form-label fw-bold mb-0">Concept *</label>
                      <StudentProjectFieldManageLink to="/ecommerce/student-projects/concepts" title="Manage concepts" />
                    </div>
                    {conceptsLoading ? (
                      <CheckboxGroupSkeleton />
                    ) : concepts.length === 0 ? (
                      <p className="text-muted mb-0 small">No concepts available</p>
                    ) : (
                      <div className="student-project-checkbox-scroll">
                        {sortOthersLast(concepts).map((item) => (
                          <div key={item._id}>
                            <input
                              type="checkbox"
                              checked={concept.includes(item.name)}
                              onChange={() => toggleCheckbox(item.name, concept, setConcept)}
                            />{' '}
                            {item.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {concept.length === 0 && <p className="text-danger">Select at least one concept</p>}
                  </Col>

                  <Col lg={3} className="student-project-field-box mb-2">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
                      <label className="form-label fw-bold mb-0">Type *</label>
                      <StudentProjectFieldManageLink to="/ecommerce/student-projects/types" title="Manage types" />
                    </div>
                    {typesLoading ? (
                      <CheckboxGroupSkeleton />
                    ) : types.length === 0 ? (
                      <p className="text-muted mb-0 small">No types available</p>
                    ) : (
                      <div className="student-project-checkbox-scroll">
                        {sortOthersLast(types).map((item) => (
                          <div key={item._id}>
                            <input type="checkbox" checked={type.includes(item.name)} onChange={() => toggleCheckbox(item.name, type, setType)} />{' '}
                            {item.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {type.length === 0 && <p className="text-danger">Select at least one type</p>}
                  </Col>

                  <Col lg={3} className="student-project-field-box mb-2">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
                      <label className="form-label fw-bold mb-0">Category *</label>
                      <StudentProjectFieldManageLink to="/ecommerce/student-projects/categories" title="Manage categories" />
                    </div>
                    {categoriesLoading ? (
                      <CheckboxGroupSkeleton />
                    ) : categories.length === 0 ? (
                      <p className="text-muted mb-0 small">No categories available</p>
                    ) : (
                      <div className="student-project-checkbox-scroll">
                        {sortOthersLast(categories).map((item) => (
                          <div key={item._id}>
                            <input
                              type="checkbox"
                              checked={category.includes(item.name)}
                              onChange={() => toggleCheckbox(item.name, category, setCategory)}
                            />{' '}
                            {item.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {category.length === 0 && <p className="text-danger">Select at least one category</p>}
                  </Col>

                  <Col lg={3} className="student-project-field-box">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
                      <label className="form-label fw-bold mb-0">Year *</label>
                      <StudentProjectFieldManageLink to="/ecommerce/student-projects/years" title="Manage years" />
                    </div>
                    {yearsLoading ? (
                      <CheckboxGroupSkeleton />
                    ) : years.length === 0 ? (
                      <p className="text-muted mb-0 small">No years available</p>
                    ) : (
                      <div className="student-project-checkbox-scroll">
                        {sortOthersLast(years).map((item) => (
                          <div key={item._id}>
                            <input type="checkbox" checked={year.includes(item.name)} onChange={() => toggleCheckbox(item.name, year, setYear)} />{' '}
                            {item.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {year.length === 0 && <p className="text-danger">Select at least one year</p>}
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col lg={3} className="student-project-field-box mb-2">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
                      <label className="form-label fw-bold mb-0">Location *</label>
                      <StudentProjectFieldManageLink to="/ecommerce/student-projects/locations" title="Manage locations" />
                    </div>
                    {locationsLoading ? (
                      <CheckboxGroupSkeleton />
                    ) : locations.length === 0 ? (
                      <p className="text-muted mb-0 small">No locations available</p>
                    ) : (
                      <div className="student-project-checkbox-scroll">
                        {sortOthersLast(locations).map((item) => (
                          <div key={item._id}>
                            <input
                              type="checkbox"
                              checked={location.includes(item.name)}
                              onChange={() => toggleCheckbox(item.name, location, setLocation)}
                            />{' '}
                            {item.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {location.length === 0 && <p className="text-danger">Select at least one location</p>}
                  </Col>

                  <Col lg={3} className="student-project-field-box mb-2">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
                      <label className="form-label fw-bold mb-0">University *</label>
                      <StudentProjectFieldManageLink to="/ecommerce/student-projects/universities" title="Manage universities" />
                    </div>
                    {universitiesLoading ? (
                      <CheckboxGroupSkeleton />
                    ) : universities.length === 0 ? (
                      <p className="text-muted mb-0 small">No universities available</p>
                    ) : (
                      <div className="student-project-checkbox-scroll">
                        {sortOthersLast(universities).map((item) => (
                          <div key={item._id}>
                            <input
                              type="checkbox"
                              checked={university.includes(item.name)}
                              onChange={() => toggleCheckbox(item.name, university, setUniversity)}
                            />{' '}
                            {item.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {university.length === 0 && <p className="text-danger">Select at least one university</p>}
                  </Col>

                  <Col lg={1} />

                  <Col lg={5}>
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
                  </Col>
                </Row>

                <Row>
                  <Col lg={4}>
                    <div className="mb-3">
                      <label className="form-label">Google Map (optional)</label>
                      <input
                        type="url"
                        className="form-control"
                        placeholder="https://maps.google.com/..."
                        value={googleMapUrl}
                        onChange={(e) => setGoogleMapUrl(e.target.value)}
                      />
                    </div>
                  </Col>
                  <Col lg={4}>
                    <div className="mb-3">
                      <label className="form-label">Thesis (optional)</label>
                      <input
                        type="url"
                        className="form-control"
                        placeholder="https://..."
                        value={thesisUrl}
                        onChange={(e) => setThesisUrl(e.target.value)}
                      />
                    </div>
                  </Col>
                  <Col lg={4}>
                    <div className="mb-3">
                      <label className="form-label">File (optional)</label>
                      <input
                        type="url"
                        className="form-control"
                        placeholder="https://..."
                        value={fileUrl}
                        onChange={(e) => setFileUrl(e.target.value)}
                      />
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
                  helpText={PROJECT_IMAGE_UPLOAD_HELP_TEXT}
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

                {/* Dynamic Content Blocks Section */}
                <hr className="my-4" />
                <h4 className="mb-3">Dynamic Content Blocks</h4>

                {dynamicBlocks.map((block, index) => (
                  <div key={block.id} className="mb-3 p-3 border rounded">
                    <div className="d-flex justify-content-between align-items-center gap-2 mb-3 flex-wrap">
                      <div className="d-flex gap-1 align-items-center flex-wrap">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveBlock(index, -1)}
                          aria-label="Move block up">
                          ↑
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          type="button"
                          disabled={index === dynamicBlocks.length - 1}
                          onClick={() => moveBlock(index, 1)}
                          aria-label="Move block down">
                          ↓
                        </Button>
                        <span className="text-capitalize fw-bold ms-2">{block.type}</span>
                      </div>
                      <Button variant="danger" size="sm" type="button" onClick={() => removeBlock(block.id)}>
                        Remove
                      </Button>
                    </div>

                    {block.type === 'title' && (
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter title"
                        value={block.content}
                        onChange={(e) => updateBlock(block.id, e.target.value)}
                      />
                    )}

                    {block.type === 'description' && (
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Enter description"
                        value={block.content}
                        onChange={(e) => updateBlock(block.id, e.target.value)}
                      />
                    )}

                    {block.type === 'quote' && (
                      <textarea
                        className="form-control fst-italic"
                        rows={2}
                        placeholder="Enter quote"
                        value={block.content}
                        onChange={(e) => updateBlock(block.id, e.target.value)}
                      />
                    )}

                    {block.type === 'image' && (
                      <div>
                        <input
                          type="file"
                          className="form-control"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              updateBlock(block.id, e.target.files[0])
                            }
                          }}
                        />
                        {/* Show preview for existing image URL */}
                        {block.content && typeof block.content === 'string' && (
                          <div className="mt-2">
                            <img src={block.content} alt="Block content" style={{ width: 100, height: 100, objectFit: 'contain' }} />
                          </div>
                        )}
                        {/* Show name for new file */}
                        {block.content && block.content instanceof File && <div className="mt-2 text-muted">Selected: {block.content.name}</div>}
                      </div>
                    )}
                  </div>
                ))}

                <div className="mb-4">
                  <label className="form-label d-block">Add New Block</label>
                  <div className="d-flex gap-2">
                    <Button variant="outline-primary" type="button" onClick={() => addBlock('title')}>
                      + Title
                    </Button>
                    <Button variant="outline-primary" type="button" onClick={() => addBlock('description')}>
                      + Description
                    </Button>
                    <Button variant="outline-primary" type="button" onClick={() => addBlock('image')}>
                      + Image
                    </Button>
                    <Button variant="outline-primary" type="button" onClick={() => addBlock('quote')}>
                      + Quote
                    </Button>
                  </div>
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Project'}
                </Button>
              </form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </RequireProfileComplete>
  )
}

export default EditProject
