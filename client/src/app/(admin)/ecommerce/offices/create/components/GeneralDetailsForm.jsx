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
  title: yup.string().required('Office title is required'),
  location: yup.string().required('Location is required'),
  locationMap: yup.string().required('Location Map is required'),
  email: yup.string().required('Email is required'),
  instagram: yup.string().required('Instagram is required'),
  linkedin: yup.string().required('Linkedin is required'),
  order: yup.number().typeError('Order must be a number').required('Order is required'),
  teamNb: yup.number().typeError('TeamNb must be a number').required('TeamNb is required'),
  category: yup.array().of(yup.string()).min(1, 'Select at least one category').required(),
  status: yup.array().of(yup.string()).min(1, 'Select at least one status').required(),
})

const normalizeQuillValue = (value) => {
  if (!value || value === '<p><br></p>' || value === '<br/>') return ''
  return value
}

const GeneralDetailsForm = () => {
  const { createOffice } = useGlobalContext()
  const [loading, setLoading] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState(null)
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
      location: '',
      locationMap: '',
      email: '',
      instagram: '',
      linkedin: '',
      order: 999,
      teamNb: 0,
      category: [],
      status: [],
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
      formData.append('location', data.location)
      formData.append('locationMap', data.locationMap)
      formData.append('email', data.email)
      formData.append('instagram', data.instagram)
      formData.append('linkedin', data.linkedin)

      formData.append('thumbnail', thumbnailFile)
      formData.append('order', data.order)
      formData.append('teamNb', data.teamNb)

      data.category.forEach((value) => formData.append('category', value))
      data.status.forEach((value) => formData.append('status', value))

      await createOffice(formData)

      alert('Office created successfully!')

      // ✅ Clear all form fields properly
      reset({
        title: '',
        location: '',
        locationMap: '',
        email: '',
        instagram: '',
        linkedin: '',
        order: 999,
        teamNb: 0,
        category: [],
        status: [],
      })

      setThumbnailFile(null)
      setResetDropzones(true)
      setTimeout(() => setResetDropzones(false), 0) // reset flag
    } catch (error) {
      alert(error?.response?.data?.message || '❌ Failed to create Office')
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
            label="Office Title"
            placeholder="Enter Office title"
            containerClassTitle="mb-3"
            id="office-title"
            name="title"
            // error={errors.title?.message}
          />
        </Col>
        <Col lg={3}>
          <TextFormInput
            control={control}
            label="Location"
            placeholder="Enter Location"
            containerClassTitle="mb-3"
            id="office-location"
            name="location"
            // error={errors.location?.message}
          />
        </Col>

        <Col lg={3}>
          <TextFormInput
            control={control}
            label="Location Map"
            placeholder="Enter Location Map"
            containerClassTitle="mb-3"
            id="office-location-map"
            name="locationMap"
            // error={errors.locationMap?.message}
          />
        </Col>

        <Col lg={3}>
          <TextFormInput control={control} label="Order" placeholder="Enter display order" containerClassName="mb-3" name="order" type="number" />
        </Col>
      </Row>

      <Row>
        <Col lg={3}>
          <TextFormInput
            control={control}
            label="Instagram"
            placeholder="Enter Instagram"
            containerClassTitle="mb-3"
            id="office-instagram"
            name="instagram"
            // error={errors.instagram?.message}
          />
        </Col>
        <Col lg={3}>
          <TextFormInput
            control={control}
            label="Linkedin"
            placeholder="Enter Linkedin"
            containerClassTitle="mb-3"
            id="office-linkedin"
            name="linkedin"
            // error={errors.linkedin?.message}
          />
        </Col>

        <Col lg={3}>
          <TextFormInput
            control={control}
            label="Email"
            placeholder="Enter Email"
            containerClassTitle="mb-3"
            id="office-email"
            name="email"
            // error={errors.email?.message}
          />
        </Col>

        <Col lg={3}>
          <TextFormInput control={control} label="TeamNb" placeholder="Enter display teamNb" containerClassName="mb-3" name="teamNb" type="number" />
        </Col>
      </Row>

      <Row>
        <Col lg={6}>
          <DropzoneFormInput
            label="Office Thumbnail"
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

        <Col lg={3}>
          <ComponentContainerCard title="Category">
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <>
                  {['Architecture', 'Real Estate', 'Technologies', 'Health Lifestyle', 'AI', 'Documentaries'].map((item) => (
                    <FormCheck key={item} label={item} checked={field.value.includes(item)} onChange={() => toggleCheckboxValue(item, field)} />
                  ))}
                </>
              )}
            />
            {errors.category && <p className="text-danger">{errors.category.message}</p>}
          </ComponentContainerCard>
        </Col>

        <Col lg={3}>
          <ComponentContainerCard title="Status">
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <>
                  {['Hiring', 'Not Hiring'].map((item) => (
                    <FormCheck key={item} label={item} checked={field.value.includes(item)} onChange={() => toggleCheckboxValue(item, field)} />
                  ))}
                </>
              )}
            />
            {errors.status && <p className="text-danger">{errors.status.message}</p>}
          </ComponentContainerCard>
        </Col>
      </Row>

      <Button type="submit" disabled={loading} className="mt-4">
        {loading ? 'Creating...' : 'Create Office'}
      </Button>
    </form>
  )
}
export default GeneralDetailsForm
