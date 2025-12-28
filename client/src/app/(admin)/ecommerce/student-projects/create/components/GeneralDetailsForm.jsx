import { yupResolver } from '@hookform/resolvers/yup'
import { Col, Row, Button, FormCheck } from 'react-bootstrap'
import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import ReactQuill from 'react-quill'
import * as yup from 'yup'
import SelectFormInput from '@/components/form/SelectFormInput'
import TextFormInput from '@/components/form/TextFormInput'
import { getAllProjectCategories } from '@/helpers/data'
import { renameKeys } from '@/utils/rename-object-keys'
import 'react-quill/dist/quill.snow.css'
import { useGlobalContext } from '@/context/useGlobalContext'
import DropzoneFormInput from '@/components/form/DropzoneFormInput'
import ComponentContainerCard from '@/components/ComponentContainerCard'

const generalFormSchema = yup.object({
  name: yup.string().required('Project name is required'),
  title: yup.string().required('Project title is required'),
  category: yup.string().required('Project Category is required'),
  descQuill: yup.string().required('Project description is required'),
  location: yup.string().required('Project location is required'),
  order: yup.number().typeError('Order must be a number').required('Order is required'),
  concept: yup.array().of(yup.string()).min(1, 'Select at least one concept').required(),
  type: yup.array().of(yup.string()).min(1, 'Select at least one type').required(),
})

const normalizeQuillValue = (value) => {
  if (!value || value === '<p><br></p>' || value === '<br/>') return ''
  return value
}

const GeneralDetailsForm = () => {
  const { createProject } = useGlobalContext()
  const [loading, setLoading] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [galleryFiles, setGalleryFiles] = useState([])
  const [projectCategories, setProjectCategories] = useState([])
  const [resetDropzones, setResetDropzones] = useState(false)

  useEffect(() => {
    const fetchCategories = async () => {
      const data = await getAllProjectCategories()
      if (!data) return
      const categoryOptions = data.map((category) =>
        renameKeys(category, {
          id: 'value',
          name: 'label',
        }),
      )
      setProjectCategories(categoryOptions)
    }
    fetchCategories()
  }, [])

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(generalFormSchema),
    defaultValues: {
      name: '',
      title: '',
      category: '',
      descQuill: '',
      location: '',
      order: 999,
      concept: [],
      type: [],
    },
  })

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      if (!thumbnailFile) {
        alert('Thumbnail image is required')
        return
      }

      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('title', data.title)

      // ✅ Convert value to label before sending
      const selectedCategory = projectCategories.find((cat) => cat.value === data.category)
      const categoryName = selectedCategory ? selectedCategory.label : data.category
      formData.append('category', categoryName)

      formData.append('description', data.descQuill)
      formData.append('location', data.location)
      formData.append('thumbnail', thumbnailFile)
      formData.append('order', data.order)

      // ✅ multiple gallery files (optional)
      galleryFiles.forEach((file) => formData.append('gallery', file))

      data.concept.forEach((value) => formData.append('concept', value))
      data.type.forEach((value) => formData.append('type', value))

      await createProject(formData)

      alert('Project created successfully!')

      // ✅ Clear all form fields properly
      reset({
        name: '',
        title: '',
        category: '',
        descQuill: '',
        location: '',
        order: 999,
      })

      setThumbnailFile(null)
      setGalleryFiles([])
      setResetDropzones(true)
      setTimeout(() => setResetDropzones(false), 0) // reset flag
    } catch (error) {
      alert(error?.response?.data?.message || '❌ Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  const toggleCheckboxValue = (value, field) => {
    const exists = field.value.includes(value)
    return exists ? field.onChange(field.value.filter((v) => v !== value)) : field.onChange([...field.value, value])
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Row>
        <Col lg={6}>
          <TextFormInput
            control={control}
            label="Project Name"
            placeholder="Enter project name"
            containerClassName="mb-3"
            id="project-name"
            name="name"
            // error={errors.name?.message}
          />
        </Col>
        <Col lg={6}>
          {projectCategories.length > 0 && (
            <div className="mb-3">
              <label htmlFor="projectSummary" className="form-label">
                Category
              </label>
              <SelectFormInput control={control} name="category" options={projectCategories} />
              {errors.category && <p className="text-danger mt-1">{errors.category.message}</p>}
            </div>
          )}
        </Col>
      </Row>

      <Row>
        <Col lg={6}>
          <TextFormInput
            control={control}
            label="Project Title"
            placeholder="Enter project title"
            containerClassTitle="mb-3"
            id="project-title"
            name="title"
            // error={errors.title?.message}
          />
        </Col>
        <Col lg={6}>
          <TextFormInput control={control} label="Order" placeholder="Enter display order" containerClassName="mb-3" name="order" type="number" />
        </Col>
      </Row>

      <Row>
        <Col lg={4}>
          <ComponentContainerCard title="Concept">
            <Controller
              name="concept"
              control={control}
              render={({ field }) => (
                <>
                  {['Sustainability', 'Function', 'Formalism'].map((item) => (
                    <FormCheck key={item} label={item} checked={field.value.includes(item)} onChange={() => toggleCheckboxValue(item, field)} />
                  ))}
                </>
              )}
            />
            {errors.concept && <p className="text-danger">{errors.concept.message}</p>}
          </ComponentContainerCard>
        </Col>
        <Col lg={4}>
          <ComponentContainerCard title="Type">
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <>
                  {['Educational', 'Touristic', 'Residential'].map((item) => (
                    <FormCheck key={item} label={item} checked={field.value.includes(item)} onChange={() => toggleCheckboxValue(item, field)} />
                  ))}
                </>
              )}
            />
            {errors.type && <p className="text-danger">{errors.type.message}</p>}
          </ComponentContainerCard>
        </Col>
      </Row>

      <Row>
        <Col lg={12}>
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
        <Col lg={6}>
          <DropzoneFormInput
            label="Project Thumbnail"
            labelClassName="fs-14 mb-1 mt-5"
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
            }}
          />
          {errors.thumbnail && <p className="text-danger mt-1">{errors.thumbnail.message}</p>}
        </Col>
        <Col lg={6}>
          <TextFormInput control={control} name="location" label="Location" containerClassName="mb-4 mt-5" placeholder="Enter Location" />
          {/* {errors.location && <p className="text-danger mt-1">{errors.location.message}</p>} */}
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

      <Button type="submit" disabled={loading} className="mt-4">
        {loading ? 'Creating...' : 'Create Project'}
      </Button>
    </form>
  )
}
export default GeneralDetailsForm
