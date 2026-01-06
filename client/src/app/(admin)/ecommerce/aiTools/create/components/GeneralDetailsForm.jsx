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
  title: yup.string().required('AiTool title is required'),
  link: yup.string().required('Link is required'),
  category: yup.string().required('Category is required'),
  order: yup.number().typeError('Order must be a number').required('Order is required'),
})

const normalizeQuillValue = (value) => {
  if (!value || value === '<p><br></p>' || value === '<br/>') return ''
  return value
}

const GeneralDetailsForm = () => {
  const { createAiTool } = useGlobalContext()
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
      link: '',
      category: '',
      order: 999,
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
      formData.append('category', data.category)
      formData.append('link', data.link)
      formData.append('thumbnail', thumbnailFile)
      formData.append('order', data.order)

      await createAiTool(formData)

      alert('AiTool created successfully!')

      // ✅ Clear all form fields properly
      reset({
        title: '',
        category: '',
        link: '',
        order: 999,
      })

      setThumbnailFile(null)
      setResetDropzones(true)
      setTimeout(() => setResetDropzones(false), 0) // reset flag
    } catch (error) {
      alert(error?.response?.data?.message || '❌ Failed to create aiTool')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Row>
        <Col lg={3}>
          <TextFormInput
            control={control}
            label="AiTool Title"
            placeholder="Enter aiTool title"
            containerClassTitle="mb-3"
            id="aiTool-title"
            name="title"
            // error={errors.title?.message}
          />
        </Col>
        <Col lg={3}>
          <TextFormInput
            control={control}
            label="Category"
            placeholder="Enter Category"
            containerClassTitle="mb-3"
            id="aiTool-category"
            name="category"
            // error={errors.category?.message}
          />
        </Col>
        <Col lg={3}>
          <TextFormInput
            control={control}
            label="Link"
            placeholder="Enter Link"
            containerClassTitle="mb-3"
            id="aiTool-link"
            name="link"
            // error={errors.link?.message}
          />
        </Col>
        <Col lg={3}>
          <TextFormInput control={control} label="Order" placeholder="Enter display order" containerClassName="mb-3" name="order" type="number" />
        </Col>
      </Row>

      <Row>
        <Col lg={6}>
          <DropzoneFormInput
            label="AiTool Thumbnail"
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

      <Button type="submit" disabled={loading} className="mt-4">
        {loading ? 'Creating...' : 'Create AiTool'}
      </Button>
    </form>
  )
}
export default GeneralDetailsForm
