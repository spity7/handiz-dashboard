import { yupResolver } from '@hookform/resolvers/yup'
import { Col, Row, Button, FormCheck } from 'react-bootstrap'
import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import ReactQuill from 'react-quill'
import * as yup from 'yup'
import TextFormInput from '@/components/form/TextFormInput'
import SelectFormInput from '@/components/form/SelectFormInput'
import 'react-quill/dist/quill.snow.css'
import { useGlobalContext } from '@/context/useGlobalContext'
import ThumbnailDropzoneInput from '@/components/form/ThumbnailDropzoneInput'
import ComponentContainerCard from '@/components/ComponentContainerCard'
import useConfirmFormSubmit from '@/hooks/useConfirmFormSubmit'
import { buildFormConfirmOptions } from '@/utils/formConfirm'
import useRegisterRhfFormDirty from '@/hooks/useRegisterRhfFormDirty'
import { useLmsAsyncBusy } from '@/context/LmsAsyncBusyContext'
import { useNavigate } from 'react-router-dom'

const STATUS_OPTIONS = ['Draft', 'Published', 'Archived']

const DEFAULTS = {
  title: '',
  sku: '',
  excerpt: '',
  descQuill: '',
  price: 0,
  salePrice: 0,
  status: 'Draft',
  sortOrder: 999,
  stockQuantity: 0,
  lowStockThreshold: 5,
  categoryIds: [],
  featured: false,
  trackInventory: true,
}

const schema = yup.object({
  title: yup.string().required('Title is required'),
  price: yup.number().min(0).required('Price is required'),
  salePrice: yup.number().min(0).nullable(),
  status: yup.string().oneOf(STATUS_OPTIONS).required(),
  sortOrder: yup.number().required(),
  stockQuantity: yup.number().min(0).required(),
})

const normalizeQuillValue = (value) => {
  if (!value || value === '<p><br></p>') return ''
  return value
}

const GeneralDetailsForm = ({ product, mode = 'create' }) => {
  const navigate = useNavigate()
  const { createShopProduct, updateShopProduct, getShopCategories } = useGlobalContext()
  const confirmFormSubmit = useConfirmFormSubmit()
  const [loading, setLoading] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [galleryFiles, setGalleryFiles] = useState([])
  const [categories, setCategories] = useState([])

  useEffect(() => {
    getShopCategories().then((list) => setCategories(Array.isArray(list) ? list : []))
  }, [getShopCategories])

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    mode: 'onChange',
    resolver: yupResolver(schema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    if (product && mode === 'edit') {
      reset({
        title: product.title || '',
        sku: product.sku || '',
        excerpt: product.excerpt || '',
        descQuill: product.description || '',
        price: product.price ?? 0,
        salePrice: product.salePrice ?? 0,
        status: product.status || 'Draft',
        sortOrder: product.sortOrder ?? 999,
        stockQuantity: product.stockQuantity ?? 0,
        lowStockThreshold: product.lowStockThreshold ?? 5,
        categoryIds: (product.categoryIds || []).map((c) => (typeof c === 'object' ? c._id : c)),
        featured: Boolean(product.featured),
        trackInventory: product.trackInventory !== false,
      })
    }
  }, [product, mode, reset])

  const formValues = watch()
  useRegisterRhfFormDirty(DEFAULTS, formValues, {
    extraDirty: Boolean(thumbnailFile) || galleryFiles.length > 0,
  })
  useLmsAsyncBusy(loading)

  const buildFormData = (data) => {
    const formData = new FormData()
    formData.append('title', data.title)
    formData.append('sku', data.sku || '')
    formData.append('excerpt', data.excerpt || '')
    formData.append('description', normalizeQuillValue(data.descQuill))
    formData.append('price', data.price)
    formData.append('salePrice', data.salePrice || 0)
    formData.append('status', data.status)
    formData.append('sortOrder', data.sortOrder)
    formData.append('stockQuantity', data.stockQuantity)
    formData.append('lowStockThreshold', data.lowStockThreshold)
    formData.append('featured', data.featured ? 'true' : 'false')
    formData.append('trackInventory', data.trackInventory ? 'true' : 'false')
    formData.append('categoryIds', JSON.stringify(data.categoryIds || []))
    if (thumbnailFile) formData.append('thumbnail', thumbnailFile)
    galleryFiles.forEach((file) => formData.append('gallery', file))
    return formData
  }

  const onSubmit = async (data) => {
    if (mode === 'create' && !thumbnailFile) {
      alert('Thumbnail image is required')
      return
    }

    const action = mode === 'edit' ? 'update' : 'create'
    await confirmFormSubmit(buildFormConfirmOptions(action, { subject: 'this product' }), async () => {
      try {
        setLoading(true)
        const formData = buildFormData(data)
        if (mode === 'edit') {
          await updateShopProduct(product._id, formData)
          alert('Product updated')
          navigate(`/ecommerce/products/${product._id}`)
        } else {
          const result = await createShopProduct(formData)
          alert('Product created')
          navigate(`/ecommerce/products/${result.product?._id || ''}`)
        }
      } catch (e) {
        alert(e?.response?.data?.message || 'Save failed')
      } finally {
        setLoading(false)
      }
    })
  }

  const categoryOptions = categories.map((c) => ({ value: c._id, label: c.name }))

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Row>
        <Col lg={8}>
          <ComponentContainerCard title="General">
            <TextFormInput control={control} name="title" label="Title" containerClassName="mb-3" />
            <TextFormInput control={control} name="sku" label="SKU" containerClassName="mb-3" />
            <TextFormInput control={control} name="excerpt" label="Excerpt" containerClassName="mb-3" />
            <div className="mb-3">
              <label className="form-label">Description</label>
              <Controller
                name="descQuill"
                control={control}
                render={({ field }) => <ReactQuill theme="snow" value={field.value} onChange={field.onChange} />}
              />
            </div>
          </ComponentContainerCard>

          <ComponentContainerCard title="Pricing & inventory" className="mt-3">
            <Row>
              <Col md={4}>
                <TextFormInput control={control} name="price" label="Price (USD)" type="number" containerClassName="mb-3" />
              </Col>
              <Col md={4}>
                <TextFormInput control={control} name="salePrice" label="Sale price" type="number" containerClassName="mb-3" />
              </Col>
              <Col md={4}>
                <TextFormInput control={control} name="sortOrder" label="Sort order" type="number" containerClassName="mb-3" />
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <TextFormInput control={control} name="stockQuantity" label="Stock" type="number" containerClassName="mb-3" />
              </Col>
              <Col md={4}>
                <TextFormInput control={control} name="lowStockThreshold" label="Low stock threshold" type="number" containerClassName="mb-3" />
              </Col>
              <Col md={4}>
                <SelectFormInput
                  control={control}
                  name="status"
                  label="Status"
                  options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                  containerClassName="mb-3"
                />
              </Col>
            </Row>
            <Controller
              name="featured"
              control={control}
              render={({ field }) => (
                <FormCheck
                  type="switch"
                  id="featured"
                  label="Featured on shop home"
                  checked={field.value}
                  onChange={field.onChange}
                  className="mb-2"
                />
              )}
            />
            <Controller
              name="trackInventory"
              control={control}
              render={({ field }) => (
                <FormCheck type="switch" id="trackInventory" label="Track inventory" checked={field.value} onChange={field.onChange} />
              )}
            />
          </ComponentContainerCard>
        </Col>
        <Col lg={4}>
          <ComponentContainerCard title="Media">
            <ThumbnailDropzoneInput
              label={mode === 'edit' ? 'Replace thumbnail (optional)' : 'Thumbnail'}
              onFileChange={setThumbnailFile}
              existingUrl={mode === 'edit' ? product?.thumbnailUrl : undefined}
            />
            <div className="mt-3">
              <label className="form-label">Gallery images</label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="form-control"
                onChange={(e) => setGalleryFiles(Array.from(e.target.files || []))}
              />
            </div>
          </ComponentContainerCard>
          <ComponentContainerCard title="Categories" className="mt-3">
            <SelectFormInput control={control} name="categoryIds" label="Categories" options={categoryOptions} isMulti containerClassName="mb-3" />
          </ComponentContainerCard>
          <Button type="submit" variant="primary" className="w-100 mt-3" disabled={loading}>
            {mode === 'edit' ? 'Save product' : 'Create product'}
          </Button>
        </Col>
      </Row>
    </form>
  )
}

export default GeneralDetailsForm
