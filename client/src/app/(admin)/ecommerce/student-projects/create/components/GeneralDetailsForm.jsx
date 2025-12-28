import { yupResolver } from '@hookform/resolvers/yup'
import { Col, Row, Button, FormCheck } from 'react-bootstrap'
import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import ReactQuill from 'react-quill'
import * as yup from 'yup'
import SelectFormInput from '@/components/form/SelectFormInput'
import TextFormInput from '@/components/form/TextFormInput'
import { renameKeys } from '@/utils/rename-object-keys'
import 'react-quill/dist/quill.snow.css'
import { useGlobalContext } from '@/context/useGlobalContext'
import DropzoneFormInput from '@/components/form/DropzoneFormInput'
import ComponentContainerCard from '@/components/ComponentContainerCard'

const generalFormSchema = yup.object({
  title: yup.string().required('Project title is required'),
  student: yup.string().required('Student is required'),
  area: yup.string().required('Area is required'),
  descQuill: yup.string().required('Project description is required'),
  order: yup.number().typeError('Order must be a number').required('Order is required'),
  concept: yup.array().of(yup.string()).min(1, 'Select at least one concept').required(),
  type: yup.array().of(yup.string()).min(1, 'Select at least one type').required(),
  category: yup.array().of(yup.string()).min(1, 'Select at least one category').required(),
  year: yup.array().of(yup.string()).min(1, 'Select at least one year').required(),
  location: yup.array().of(yup.string()).min(1, 'Select at least one location').required(),
  university: yup.array().of(yup.string()).min(1, 'Select at least one university').required(),
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
  const [resetDropzones, setResetDropzones] = useState(false)

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

      await createProject(formData)

      alert('Project created successfully!')

      // ✅ Clear all form fields properly
      reset({
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
        <Col lg={3}>
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
        <Col lg={3}>
          <TextFormInput
            control={control}
            label="Student"
            placeholder="Enter Student"
            containerClassTitle="mb-3"
            id="project-student"
            name="student"
            // error={errors.student?.message}
          />
        </Col>
        <Col lg={3}>
          <TextFormInput
            control={control}
            label="Area"
            placeholder="Enter Area"
            containerClassTitle="mb-3"
            id="project-area"
            name="area"
            // error={errors.area?.message}
          />
        </Col>
        <Col lg={3}>
          <TextFormInput control={control} label="Order" placeholder="Enter display order" containerClassName="mb-3" name="order" type="number" />
        </Col>
      </Row>

      <Row>
        <Col lg={3}>
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
        <Col lg={3}>
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
        <Col lg={3}>
          <ComponentContainerCard title="Category">
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <>
                  {['Graduated Project', 'UnderGraduated Project', 'Arab Project', 'Competitions Project'].map((item) => (
                    <FormCheck key={item} label={item} checked={field.value.includes(item)} onChange={() => toggleCheckboxValue(item, field)} />
                  ))}
                </>
              )}
            />
            {errors.category && <p className="text-danger">{errors.category.message}</p>}
          </ComponentContainerCard>
        </Col>
        <Col lg={3}>
          <ComponentContainerCard title="Year">
            <Controller
              name="year"
              control={control}
              render={({ field }) => (
                <>
                  {['2025-2026', '2024-2025', '2023-2024', '2022-2023'].map((item) => (
                    <FormCheck key={item} label={item} checked={field.value.includes(item)} onChange={() => toggleCheckboxValue(item, field)} />
                  ))}
                </>
              )}
            />
            {errors.year && <p className="text-danger">{errors.year.message}</p>}
          </ComponentContainerCard>
        </Col>
      </Row>

      <Row>
        <Col lg={3}>
          <ComponentContainerCard title="Location">
            <Controller
              name="location"
              control={control}
              render={({ field }) => (
                <>
                  {['Lebanon', 'Jordan', 'Iraq'].map((item) => (
                    <FormCheck key={item} label={item} checked={field.value.includes(item)} onChange={() => toggleCheckboxValue(item, field)} />
                  ))}
                </>
              )}
            />
            {errors.location && <p className="text-danger">{errors.location.message}</p>}
          </ComponentContainerCard>
        </Col>
        <Col lg={3}>
          <ComponentContainerCard title="University">
            <Controller
              name="university"
              control={control}
              render={({ field }) => (
                <>
                  {['Lebaneese uni', 'USJ', 'AUB', 'Alba', 'LAU'].map((item) => (
                    <FormCheck key={item} label={item} checked={field.value.includes(item)} onChange={() => toggleCheckboxValue(item, field)} />
                  ))}
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
            }}
          />
          {errors.thumbnail && <p className="text-danger mt-1">{errors.thumbnail.message}</p>}
        </Col>
      </Row>

      <Row>
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

      <Button type="submit" disabled={loading} className="mt-4">
        {loading ? 'Creating...' : 'Create Project'}
      </Button>
    </form>
  )
}
export default GeneralDetailsForm
