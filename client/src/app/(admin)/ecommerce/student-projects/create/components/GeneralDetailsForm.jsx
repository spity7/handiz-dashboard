import { yupResolver } from '@hookform/resolvers/yup'
import { Col, Row, Button, FormCheck } from 'react-bootstrap'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import { useForm, Controller } from 'react-hook-form'
import ReactQuill from 'react-quill'
import * as yup from 'yup'
import SelectFormInput from '@/components/form/SelectFormInput'
import TextFormInput from '@/components/form/TextFormInput'
import { renameKeys } from '@/utils/rename-object-keys'
import 'react-quill/dist/quill.snow.css'
import { useGlobalContext } from '@/context/useGlobalContext'
import { useAuthContext } from '@/context/useAuthContext'
import useConfirmAction from '@/hooks/useConfirmAction'
import { ROLES } from '@/constants/roles'
import DropzoneFormInput from '@/components/form/DropzoneFormInput'
import ComponentContainerCard from '@/components/ComponentContainerCard'
import StudentProjectFieldManageLink from '../../components/StudentProjectFieldManageLink'
import ProjectFormSkeleton from '@/components/skeletons/ProjectFormSkeleton'
import CheckboxGroupSkeleton from '@/components/skeletons/CheckboxGroupSkeleton'
import { sortOthersLast } from '@/utils/sortOthersLast'

const generalFormSchema = yup.object({
  title: yup.string().required('Project title is required'),
  student: yup.string().required('Student is required'),
  area: yup.string().required('Area is required'),
  descQuill: yup
    .string()
    .transform((value) => normalizeQuillValue(value))
    .required('Project description is required'),
  order: yup.number().typeError('Order must be a number').required('Order is required'),
  concept: yup.array().of(yup.string()).min(1, 'Select at least one concept').required(),
  type: yup.array().of(yup.string()).min(1, 'Select at least one type').required(),
  category: yup.array().of(yup.string()).min(1, 'Select at least one category').required(),
  year: yup.array().of(yup.string()).min(1, 'Select at least one year').required(),
  location: yup.array().of(yup.string()).min(1, 'Select at least one location').required(),
  university: yup.array().of(yup.string()).min(1, 'Select at least one university').required(),
  googleMapUrl: yup
    .string()
    .transform((v) => (v == null ? '' : String(v).trim()))
    .test('url', 'Enter a valid http(s) URL', (val) => {
      if (!val) return true
      try {
        const u = new URL(val)
        return u.protocol === 'http:' || u.protocol === 'https:'
      } catch {
        return false
      }
    }),
  thesisUrl: yup
    .string()
    .transform((v) => (v == null ? '' : String(v).trim()))
    .test('url', 'Enter a valid http(s) URL', (val) => {
      if (!val) return true
      try {
        const u = new URL(val)
        return u.protocol === 'http:' || u.protocol === 'https:'
      } catch {
        return false
      }
    }),
  fileUrl: yup
    .string()
    .transform((v) => (v == null ? '' : String(v).trim()))
    .test('url', 'Enter a valid http(s) URL', (val) => {
      if (!val) return true
      try {
        const u = new URL(val)
        return u.protocol === 'http:' || u.protocol === 'https:'
      } catch {
        return false
      }
    }),
})

const normalizeQuillValue = (value) => {
  if (!value || value === '<p><br></p>' || value === '<br/>') return ''
  return value
}

const collectValidationMessages = (formErrors) =>
  Object.values(formErrors)
    .map((error) => error?.message)
    .filter(Boolean)

const GeneralDetailsForm = () => {
  const {
    createProject,
    getStudentProjectConcepts,
    getStudentProjectTypes,
    getStudentProjectCategories,
    getStudentProjectYears,
    getStudentProjectLocations,
    getStudentProjectUniversities,
  } = useGlobalContext()
  const { user } = useAuthContext()
  const navigate = useNavigate()
  const confirmAction = useConfirmAction()
  const [loading, setLoading] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailError, setThumbnailError] = useState(null)
  const [galleryFiles, setGalleryFiles] = useState([])
  const [resetDropzones, setResetDropzones] = useState(false)
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
    fetchConcepts()
    fetchTypes()
    fetchCategories()
    fetchYears()
    fetchLocations()
    fetchUniversities()
  }, [
    getStudentProjectConcepts,
    getStudentProjectTypes,
    getStudentProjectCategories,
    getStudentProjectYears,
    getStudentProjectLocations,
    getStudentProjectUniversities,
  ])

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(generalFormSchema),
    defaultValues: {
      title: '',
      student: '',
      area: '',
      descQuill: '',
      order: 999,
      concept: [],
      type: [],
      category: [],
      year: [],
      location: [],
      university: [],
      googleMapUrl: '',
      thesisUrl: '',
      fileUrl: '',
    },
  })

  const onInvalid = (formErrors) => {
    if (!thumbnailFile) {
      setThumbnailError('Thumbnail image is required')
    }

    const messages = collectValidationMessages(formErrors)
    if (!thumbnailFile) {
      messages.push('Thumbnail image is required')
    }

    if (messages.length > 0) {
      alert(`Please complete all required fields:\n\n• ${messages.join('\n• ')}`)
    }
  }

  const onSubmit = async (data) => {
    if (!thumbnailFile) {
      setThumbnailError('Thumbnail image is required')
      alert('Thumbnail image is required')
      return
    }
    setThumbnailError(null)

    const submitProject = async () => {
      try {
        setLoading(true)

        const formData = new FormData()
        formData.append('title', data.title)
        formData.append('student', data.student)
        formData.append('area', data.area)

        formData.append('description', data.descQuill)
        formData.append('thumbnail', thumbnailFile)
        formData.append('order', data.order)

        // ✅ multiple gallery files (optional)
        galleryFiles.forEach((file) => formData.append('gallery', file))

        data.concept.forEach((value) => formData.append('concept', value))
        data.type.forEach((value) => formData.append('type', value))
        data.category.forEach((value) => formData.append('category', value))
        data.year.forEach((value) => formData.append('year', value))
        data.location.forEach((value) => formData.append('location', value))
        data.university.forEach((value) => formData.append('university', value))
        formData.append('googleMapUrl', data.googleMapUrl || '')
        formData.append('thesisUrl', data.thesisUrl || '')
        formData.append('fileUrl', data.fileUrl || '')

        // ✅ Process dynamic blocks
        const blocksPayload = []
        let imageIndex = 0

        dynamicBlocks.forEach((block) => {
          if (block.type === 'image') {
            if (block.content instanceof File) {
              formData.append('blockImages', block.content)
              blocksPayload.push({
                type: 'image',
                fileIndex: imageIndex++,
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

        await createProject(formData)
        await Swal.fire('Created', 'Project created successfully.', 'success')
        navigate('/')
      } catch (error) {
        alert(error?.response?.data?.message || '❌ Failed to create project')
      } finally {
        setLoading(false)
      }
    }

    await confirmAction({
      title: 'Create student project?',
      text: user?.role === ROLES.USER ? 'Your project will be submitted as Pending for Admin and Editor review.' : 'Create this student project?',
      confirmLabel: 'Create',
      onConfirm: submitProject,
    })
  }

  const toggleCheckboxValue = (value, field) => {
    const exists = field.value.includes(value)
    return exists ? field.onChange(field.value.filter((v) => v !== value)) : field.onChange([...field.value, value])
  }

  const metadataLoading = conceptsLoading || typesLoading || categoriesLoading || yearsLoading || locationsLoading || universitiesLoading

  if (metadataLoading) {
    return <ProjectFormSkeleton variant="student" showLayout={false} />
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit, onInvalid)}>
      <Row>
        <Col lg={3}>
          <TextFormInput
            control={control}
            label="Project Title"
            placeholder="Enter project title"
            containerClassName="mb-3"
            id="project-title"
            name="title"
          />
        </Col>
        <Col lg={3}>
          <TextFormInput
            control={control}
            label="Student"
            placeholder="Enter Student"
            containerClassName="mb-3"
            id="project-student"
            name="student"
          />
        </Col>
        <Col lg={3}>
          <TextFormInput control={control} label="Area" placeholder="Enter Area" containerClassName="mb-3" id="project-area" name="area" />
        </Col>
        <Col lg={3}>
          <TextFormInput control={control} label="Order" placeholder="Enter display order" containerClassName="mb-3" name="order" type="number" />
        </Col>
      </Row>

      <Row>
        <Col lg={3}>
          <ComponentContainerCard
            title="Concept"
            bodyClassName="student-project-field-box"
            headerAction={<StudentProjectFieldManageLink to="/ecommerce/student-projects/concepts" title="Manage concepts" />}>
            <Controller
              name="concept"
              control={control}
              render={({ field }) => (
                <>
                  {conceptsLoading ? (
                    <p className="text-muted mb-0 small">Loading concepts...</p>
                  ) : concepts.length === 0 ? (
                    <p className="text-muted mb-0 small">No concepts available</p>
                  ) : (
                    <div className="student-project-checkbox-scroll">
                      {sortOthersLast(concepts).map((item) => (
                        <FormCheck
                          key={item._id}
                          label={item.name}
                          checked={field.value.includes(item.name)}
                          onChange={() => toggleCheckboxValue(item.name, field)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            />
            {errors.concept && <p className="text-danger">{errors.concept.message}</p>}
          </ComponentContainerCard>
        </Col>
        <Col lg={3}>
          <ComponentContainerCard
            title="Type"
            bodyClassName="student-project-field-box"
            headerAction={<StudentProjectFieldManageLink to="/ecommerce/student-projects/types" title="Manage types" />}>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <>
                  {typesLoading ? (
                    <p className="text-muted mb-0 small">Loading types...</p>
                  ) : types.length === 0 ? (
                    <p className="text-muted mb-0 small">No types available</p>
                  ) : (
                    <div className="student-project-checkbox-scroll">
                      {sortOthersLast(types).map((item) => (
                        <FormCheck
                          key={item._id}
                          label={item.name}
                          checked={field.value.includes(item.name)}
                          onChange={() => toggleCheckboxValue(item.name, field)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            />
            {errors.type && <p className="text-danger">{errors.type.message}</p>}
          </ComponentContainerCard>
        </Col>
        <Col lg={3}>
          <ComponentContainerCard
            title="Category"
            bodyClassName="student-project-field-box"
            headerAction={<StudentProjectFieldManageLink to="/ecommerce/student-projects/categories" title="Manage categories" />}>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <>
                  {categoriesLoading ? (
                    <p className="text-muted mb-0 small">Loading categories...</p>
                  ) : categories.length === 0 ? (
                    <p className="text-muted mb-0 small">No categories available</p>
                  ) : (
                    <div className="student-project-checkbox-scroll">
                      {sortOthersLast(categories).map((item) => (
                        <FormCheck
                          key={item._id}
                          label={item.name}
                          checked={field.value.includes(item.name)}
                          onChange={() => toggleCheckboxValue(item.name, field)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            />
            {errors.category && <p className="text-danger">{errors.category.message}</p>}
          </ComponentContainerCard>
        </Col>
        <Col lg={3}>
          <ComponentContainerCard
            title="Year"
            bodyClassName="student-project-field-box"
            headerAction={<StudentProjectFieldManageLink to="/ecommerce/student-projects/years" title="Manage years" />}>
            <Controller
              name="year"
              control={control}
              render={({ field }) => (
                <>
                  {yearsLoading ? (
                    <p className="text-muted mb-0 small">Loading years...</p>
                  ) : years.length === 0 ? (
                    <p className="text-muted mb-0 small">No years available</p>
                  ) : (
                    <div className="student-project-checkbox-scroll">
                      {sortOthersLast(years).map((item) => (
                        <FormCheck
                          key={item._id}
                          label={item.name}
                          checked={field.value.includes(item.name)}
                          onChange={() => toggleCheckboxValue(item.name, field)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            />
            {errors.year && <p className="text-danger">{errors.year.message}</p>}
          </ComponentContainerCard>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col lg={3}>
          <ComponentContainerCard
            title="Location"
            bodyClassName="student-project-field-box"
            headerAction={<StudentProjectFieldManageLink to="/ecommerce/student-projects/locations" title="Manage locations" />}>
            <Controller
              name="location"
              control={control}
              render={({ field }) => (
                <>
                  {locationsLoading ? (
                    <p className="text-muted mb-0 small">Loading locations...</p>
                  ) : locations.length === 0 ? (
                    <p className="text-muted mb-0 small">No locations available</p>
                  ) : (
                    <div className="student-project-checkbox-scroll">
                      {sortOthersLast(locations).map((item) => (
                        <FormCheck
                          key={item._id}
                          label={item.name}
                          checked={field.value.includes(item.name)}
                          onChange={() => toggleCheckboxValue(item.name, field)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            />
            {errors.location && <p className="text-danger">{errors.location.message}</p>}
          </ComponentContainerCard>
        </Col>
        <Col lg={3}>
          <ComponentContainerCard
            title="University"
            bodyClassName="student-project-field-box"
            headerAction={<StudentProjectFieldManageLink to="/ecommerce/student-projects/universities" title="Manage universities" />}>
            <Controller
              name="university"
              control={control}
              render={({ field }) => (
                <>
                  {universitiesLoading ? (
                    <p className="text-muted mb-0 small">Loading universities...</p>
                  ) : universities.length === 0 ? (
                    <p className="text-muted mb-0 small">No universities available</p>
                  ) : (
                    <div className="student-project-checkbox-scroll">
                      {sortOthersLast(universities).map((item) => (
                        <FormCheck
                          key={item._id}
                          label={item.name}
                          checked={field.value.includes(item.name)}
                          onChange={() => toggleCheckboxValue(item.name, field)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            />
            {errors.university && <p className="text-danger">{errors.university.message}</p>}
          </ComponentContainerCard>
        </Col>

        <Col lg={6}>
          <DropzoneFormInput
            label="Project Thumbnail"
            labelClassName="fs-14 mb-1"
            iconProps={{
              icon: 'bx:cloud-upload',
              height: 36,
              width: 36,
            }}
            text="Upload Thumbnail image"
            showPreview
            resetTrigger={resetDropzones}
            onFileUpload={(files) => {
              if (files.length > 1) {
                alert('Only one thumbnail is allowed')
                // 🧹 Immediately reset the Dropzone
                setThumbnailFile(null)
                setResetDropzones(true)
                setTimeout(() => setResetDropzones(false), 0)
                return
              }

              // ✅ valid single file
              setThumbnailFile(files[0])
              setThumbnailError(null)
            }}
          />
          {thumbnailError && <p className="text-danger mt-1">{thumbnailError}</p>}
        </Col>
      </Row>

      <Row>
        <Col lg={4}>
          <TextFormInput
            control={control}
            label="Google Map (optional)"
            placeholder="https://maps.google.com/..."
            containerClassName="mb-3"
            id="project-google-map"
            name="googleMapUrl"
            type="text"
          />
          {errors.googleMapUrl && <p className="text-danger small">{errors.googleMapUrl.message}</p>}
        </Col>
        <Col lg={4}>
          <TextFormInput
            control={control}
            label="Thesis (optional)"
            placeholder="https://..."
            containerClassName="mb-3"
            id="project-thesis"
            name="thesisUrl"
            type="text"
          />
          {errors.thesisUrl && <p className="text-danger small">{errors.thesisUrl.message}</p>}
        </Col>
        <Col lg={4}>
          <TextFormInput
            control={control}
            label="File (optional)"
            placeholder="https://..."
            containerClassName="mb-3"
            id="project-file-url"
            name="fileUrl"
            type="text"
          />
          {errors.fileUrl && <p className="text-danger small">{errors.fileUrl.message}</p>}
        </Col>
      </Row>

      <Row className="mb-3">
        <Col lg={6}>
          <div className="mb-5 mt-3">
            <label className="form-label">Project Description</label>
            <Controller
              name="descQuill"
              control={control}
              render={({ field }) => (
                <ReactQuill
                  theme="snow"
                  value={normalizeQuillValue(field.value)}
                  onChange={(content) => field.onChange(normalizeQuillValue(content))}
                  style={{ height: 195 }}
                  className="pb-sm-3 pb-5 pb-xl-0"
                  modules={{
                    toolbar: [
                      [{ font: [] }, { size: [] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ color: [] }, { background: [] }],
                      [{ script: 'super' }, { script: 'sub' }],
                      [{ header: [false, 1, 2, 3, 4, 5, 6] }, 'blockquote', 'code-block'],
                      [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
                      [{ direction: 'rtl' }, { align: [] }],
                      ['link', 'image', 'video'],
                      ['clean'],
                    ],
                  }}
                />
              )}
            />
            {errors.descQuill && <p className="text-danger mt-1">{errors.descQuill.message}</p>}
          </div>
        </Col>
      </Row>

      <Row>
        <Col lg={12}>
          <DropzoneFormInput
            label="Project Gallery"
            labelClassName="fs-14 mb-1 mt-2"
            iconProps={{
              icon: 'bx:cloud-upload',
              height: 36,
              width: 36,
            }}
            text="Upload Gallery Images"
            showPreview
            resetTrigger={resetDropzones}
            onFileUpload={(files) => setGalleryFiles(files)}
          />
        </Col>
      </Row>

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

      <Button type="submit" disabled={loading} className="mt-4">
        {loading ? 'Creating...' : 'Create Project'}
      </Button>
    </form>
  )
}
export default GeneralDetailsForm
