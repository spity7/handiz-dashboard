import { yupResolver } from '@hookform/resolvers/yup'
import { Col, Row, Button, Form } from 'react-bootstrap'
import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import ReactQuill from 'react-quill'
import * as yup from 'yup'
import TextFormInput from '@/components/form/TextFormInput'
import 'react-quill/dist/quill.snow.css'
import { useGlobalContext } from '@/context/useGlobalContext'
import DropzoneFormInput from '@/components/form/DropzoneFormInput'
import ComponentContainerCard from '@/components/ComponentContainerCard'
import { Link } from 'react-router-dom'

const normalizeQuillValue = (value) => {
  if (!value || value === '<p><br></p>' || value === '<br/>') return ''
  return value
}

const apiErrorMessage = (error, fallback) => {
  const data = error?.response?.data
  if (data == null) return error?.message || fallback
  if (typeof data === 'string') return data.trim() || fallback
  if (typeof data.message === 'string') return data.message
  if (typeof data.error === 'string') return data.error
  return fallback
}

const generalFormSchema = yup.object({
  title: yup.string().required('Title is required'),
  categoryId: yup.string().required('Select a category'),
  descQuill: yup
    .string()
    .transform((v) => normalizeQuillValue(v))
    .required('Description is required'),
  order: yup.number().typeError('Order must be a number').required('Order is required'),
})

const GeneralDetailsForm = () => {
  const { createAiTool, getAiPromptCategories } = useGlobalContext()
  const [loading, setLoading] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [resetDropzones, setResetDropzones] = useState(false)
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await getAiPromptCategories()
        if (!cancelled) setCategories(Array.isArray(list) ? list : [])
      } catch (e) {
        console.error(e)
        if (!cancelled) setCategories([])
      } finally {
        if (!cancelled) setCategoriesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getAiPromptCategories])

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(generalFormSchema),
    defaultValues: {
      title: '',
      categoryId: '',
      descQuill: '',
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
      formData.append('category', data.categoryId)
      formData.append('description', data.descQuill)
      formData.append('thumbnail', thumbnailFile)
      formData.append('order', data.order)

      await createAiTool(formData)

      alert('AI Prompt created successfully!')

      reset({
        title: '',
        categoryId: '',
        descQuill: '',
        order: 999,
      })

      setThumbnailFile(null)
      setResetDropzones(true)
      setTimeout(() => setResetDropzones(false), 0)
    } catch (error) {
      alert(apiErrorMessage(error, 'Failed to create AI Prompt'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Row className="g-3">
        <Col lg={3}>
          <TextFormInput control={control} label="Title" placeholder="Enter title" containerClassName="mb-3" id="ai-prompt-title" name="title" />
        </Col>
        <Col lg={3}>
          <TextFormInput control={control} label="Order" placeholder="Display order" containerClassName="mb-3" name="order" type="number" />
        </Col>
        <Col lg={6}>
          <ComponentContainerCard title="Category">
            <p className="text-muted small mb-2">
              Manage labels in <Link to="/ecommerce/aiTools/categories">AI Prompt categories</Link>.
            </p>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Form.Select {...field} id="ai-prompt-category-select" disabled={categoriesLoading}>
                  <option value="">{categoriesLoading ? 'Loading…' : 'Select category'}</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                      {c.isFallback ? ' (fallback)' : ''}
                    </option>
                  ))}
                </Form.Select>
              )}
            />
            {errors.categoryId && <p className="text-danger mt-2 mb-0">{errors.categoryId.message}</p>}
            {!categoriesLoading && categories.length === 0 && (
              <p className="text-warning small mt-2 mb-0">Add at least one category before creating a prompt.</p>
            )}
          </ComponentContainerCard>
        </Col>
      </Row>

      <Row className="g-3">
        <Col lg={8}>
          <div className="mb-5 mt-3">
            <label className="form-label">Description</label>
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
        <Col lg={4}>
          <DropzoneFormInput
            label="Thumbnail"
            labelClassName="fs-14 mb-1"
            iconProps={{
              icon: 'bx:cloud-upload',
              height: 36,
              width: 36,
            }}
            text="Upload thumbnail image"
            showPreview
            resetTrigger={resetDropzones}
            onFileUpload={(files) => {
              if (files.length > 1) {
                alert('Only one thumbnail is allowed')
                setThumbnailFile(null)
                setResetDropzones(true)
                setTimeout(() => setResetDropzones(false), 0)
                return
              }

              setThumbnailFile(files[0])
            }}
          />
          {errors.thumbnail && <p className="text-danger mt-1">{errors.thumbnail.message}</p>}
        </Col>
      </Row>

      <Button type="submit" disabled={loading} className="mt-4">
        {loading ? 'Creating...' : 'Create AI Prompt'}
      </Button>
    </form>
  )
}
export default GeneralDetailsForm
