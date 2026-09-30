import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, CardBody, Col, Form, FormCheck, InputGroup, Row, Spinner } from 'react-bootstrap'
import { Controller, useForm } from 'react-hook-form'
import ReactQuill from 'react-quill'
import { Link, useNavigate } from 'react-router-dom'
import ReactSelect from 'react-select'
import Swal from 'sweetalert2'
import * as yup from 'yup'
import ComponentContainerCard from '@/components/ComponentContainerCard'
import RequiredFormLabel from '@/components/form/RequiredFormLabel'
import SelectFormInput from '@/components/form/SelectFormInput'
import TextFormInput from '@/components/form/TextFormInput'
import { useLmsAsyncBusy } from '@/context/LmsAsyncBusyContext'
import { useUnsavedFormChanges } from '@/context/UnsavedFormChangesContext'
import { useGlobalContext } from '@/context/useGlobalContext'
import useConfirmFormSubmit from '@/hooks/useConfirmFormSubmit'
import useRegisterRhfFormDirty from '@/hooks/useRegisterRhfFormDirty'
import { buildFormConfirmOptions } from '@/utils/formConfirm'
import ProductMediaCard, { MAX_GALLERY_IMAGES, MAX_IMAGE_BYTES } from '../../components/ProductMediaCard'
import 'react-quill/dist/quill.snow.css'

const STATUS_OPTIONS = ['Draft', 'Published', 'Archived']

const STATUS_HINTS = {
  Draft: 'Hidden from the storefront until you publish it.',
  Published: 'Visible to shoppers on the storefront.',
  Archived: 'Hidden from the storefront but kept for your records.',
}

const THUMBNAIL_REQUIRED_MESSAGE = 'A thumbnail image is required.'

const QUILL_MODULES = {
  toolbar: [[{ header: [2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link'], ['clean']],
}

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

const blankToUndefined = (value, original) => (original === '' || original == null ? undefined : value)

const numberField = (label) => yup.number().transform(blankToUndefined).typeError(`${label} must be a number`)

const schema = yup.object({
  title: yup.string().trim().required('Title is required'),
  sku: yup.string().trim(),
  price: numberField('Price').min(0, 'Price cannot be negative').required('Price is required'),
  // Blank means "no sale". The API only applies a sale price that is above 0 and below the price.
  salePrice: yup
    .number()
    .transform((value, original) => (original === '' || original == null ? 0 : value))
    .typeError('Sale price must be a number')
    .min(0, 'Sale price cannot be negative')
    .test('below-price', 'Sale price must be lower than the price', function belowPrice(value) {
      const price = Number(this.parent.price)
      return !value || !Number.isFinite(price) || price <= 0 || value < price
    }),
  status: yup.string().oneOf(STATUS_OPTIONS).required(),
  // The API treats 0 as "unset" for these two and stores the default instead, so 0 is not offered.
  sortOrder: numberField('Display order').integer('Use a whole number').min(1, 'Must be 1 or higher').required('Display order is required'),
  trackInventory: yup.boolean(),
  stockQuantity: numberField('Stock')
    .integer('Use a whole number')
    .min(0, 'Stock cannot be negative')
    .when('trackInventory', { is: true, then: (s) => s.required('Stock is required'), otherwise: (s) => s.notRequired() }),
  lowStockThreshold: numberField('Low stock alert')
    .integer('Use a whole number')
    .min(1, 'Must be 1 or higher')
    .when('trackInventory', { is: true, then: (s) => s.required('Low stock alert is required'), otherwise: (s) => s.notRequired() }),
})

// Quill 2 emits every space as &nbsp;, which stops the storefront from wrapping the description. Regular spaces
// render identically, so store those instead (this also keeps the dirty check stable when the editor mounts).
const normalizeQuillValue = (value) => {
  if (!value || value === '<p><br></p>') return ''
  return value.replace(/&nbsp;/g, ' ')
}

/** Stock-keeping code derived from the title (hidden on the form; sent on save). */
const skuFromTitle = (title) => {
  const normalized = String(title || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return normalized ? `HND-${normalized}` : ''
}

const toFormValues = (product) => {
  if (!product) return DEFAULTS
  return {
    title: product.title || '',
    sku: product.sku || '',
    excerpt: product.excerpt || '',
    descQuill: normalizeQuillValue(product.description),
    price: product.price ?? 0,
    salePrice: product.salePrice ?? 0,
    status: product.status || 'Draft',
    sortOrder: product.sortOrder ?? 999,
    stockQuantity: product.stockQuantity ?? 0,
    lowStockThreshold: product.lowStockThreshold ?? 5,
    categoryIds: (product.categoryIds || []).map((c) => (typeof c === 'object' ? c._id : c)),
    featured: Boolean(product.featured),
    trackInventory: product.trackInventory !== false,
  }
}

const formatMoney = (value) => `$${Number(value).toFixed(2)}`

/** Number input with an optional currency prefix, help text and inline validation. */
const NumberField = ({ control, name, label, required = false, prefix, help, containerClassName = 'mb-3', ...inputProps }) => (
  <Controller
    name={name}
    control={control}
    render={({ field, fieldState }) => (
      <Form.Group className={containerClassName}>
        <RequiredFormLabel htmlFor={name} required={required}>
          {label}
        </RequiredFormLabel>
        <InputGroup hasValidation>
          {prefix && <InputGroup.Text>{prefix}</InputGroup.Text>}
          <Form.Control id={name} type="number" {...inputProps} {...field} value={field.value ?? ''} isInvalid={Boolean(fieldState.error)} />
          <Form.Control.Feedback type="invalid">{fieldState.error?.message}</Form.Control.Feedback>
        </InputGroup>
        {help && <Form.Text className="text-muted">{help}</Form.Text>}
      </Form.Group>
    )}
  />
)

const GeneralDetailsForm = ({ product, mode = 'create' }) => {
  const isEdit = mode === 'edit'
  const navigate = useNavigate()
  const { createShopProduct, updateShopProduct, getShopCategories, deleteShopProductGalleryImage } = useGlobalContext()
  const { acknowledgeSuccessfulFormSave } = useUnsavedFormChanges()
  const confirmFormSubmit = useConfirmFormSubmit()

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [removingUrl, setRemovingUrl] = useState(null)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailError, setThumbnailError] = useState('')
  const [galleryFiles, setGalleryFiles] = useState([])
  const [existingGallery, setExistingGallery] = useState(product?.gallery ?? [])
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  // Any save or image removal in flight locks the whole form and blocks navigation (see UnsavedChangesBlocker).
  // Once the save has succeeded the form stays locked, but navigation must be allowed for the redirect that follows.
  const busy = saving || Boolean(removingUrl)
  useLmsAsyncBusy(busy && !saved)

  const initialValues = useMemo(() => toFormValues(product), [product])

  const { control, handleSubmit, watch, trigger, setValue } = useForm({
    mode: 'onChange',
    resolver: yupResolver(schema),
    defaultValues: initialValues,
  })

  const formValues = watch()
  const dirtyValues = useMemo(() => ({ ...formValues, descQuill: normalizeQuillValue(formValues.descQuill) }), [formValues])
  const { isDirty } = useRegisterRhfFormDirty(initialValues, dirtyValues, {
    extraDirty: Boolean(thumbnailFile) || galleryFiles.length > 0,
  })

  useEffect(() => {
    let cancelled = false
    getShopCategories()
      .then((list) => {
        if (!cancelled) setCategories(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [getShopCategories])

  const titleValue = formValues.title
  useEffect(() => {
    if (!isEdit) {
      setValue('sku', skuFromTitle(titleValue), { shouldDirty: false, shouldValidate: false })
    }
  }, [titleValue, isEdit, setValue])

  // The sale price rule depends on the price, so re-check it when either changes.
  const priceValue = formValues.price
  const saleValue = formValues.salePrice
  useEffect(() => {
    if (Number(saleValue) > 0) trigger('salePrice')
  }, [priceValue, saleValue, trigger])

  const categoryOptions = useMemo(() => categories.map((c) => ({ value: c._id, label: c.name })), [categories])

  const pricePreview = useMemo(() => {
    const price = Number(priceValue)
    const sale = Number(saleValue)
    if (!Number.isFinite(price) || price <= 0) return null
    if (Number.isFinite(sale) && sale > 0 && sale < price) {
      return { current: sale, original: price, percentOff: Math.round((1 - sale / price) * 100) }
    }
    return { current: price }
  }, [priceValue, saleValue])

  const buildFormData = (data) => {
    const formData = new FormData()
    formData.append('title', data.title)
    const sku = (data.sku || '').trim() || skuFromTitle(data.title)
    formData.append('sku', sku)
    formData.append('excerpt', data.excerpt || '')
    formData.append('description', normalizeQuillValue(data.descQuill))
    formData.append('price', data.price)
    formData.append('salePrice', data.salePrice || 0)
    formData.append('status', data.status)
    formData.append('sortOrder', data.sortOrder)
    formData.append('stockQuantity', data.stockQuantity ?? 0)
    formData.append('lowStockThreshold', data.lowStockThreshold ?? 5)
    formData.append('featured', data.featured ? 'true' : 'false')
    formData.append('trackInventory', data.trackInventory ? 'true' : 'false')
    formData.append('categoryIds', JSON.stringify(data.categoryIds || []))
    if (thumbnailFile) formData.append('thumbnail', thumbnailFile)
    galleryFiles.forEach((file) => formData.append('gallery', file))
    return formData
  }

  const getUploadErrors = () => {
    const errors = []
    if (thumbnailFile && thumbnailFile.size > MAX_IMAGE_BYTES) errors.push(`Thumbnail "${thumbnailFile.name}" is larger than 20 MB.`)
    if (galleryFiles.length > MAX_GALLERY_IMAGES) errors.push(`A maximum of ${MAX_GALLERY_IMAGES} gallery images can be uploaded per save.`)
    galleryFiles.forEach((file) => {
      if (file.size > MAX_IMAGE_BYTES) errors.push(`Gallery image "${file.name}" is larger than 20 MB.`)
    })
    return errors
  }

  const scrollToThumbnail = () => document.getElementById('product-media')?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  const handleThumbnailChange = (file) => {
    setThumbnailFile(file)
    if (file) setThumbnailError('')
  }

  const onInvalid = () => {
    if (!isEdit && !thumbnailFile) setThumbnailError(THUMBNAIL_REQUIRED_MESSAGE)
    setTimeout(() => document.querySelector('.product-form .is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
  }

  const onSubmit = async (data) => {
    if (busy) return

    if (!isEdit && !thumbnailFile) {
      setThumbnailError(THUMBNAIL_REQUIRED_MESSAGE)
      scrollToThumbnail()
      return
    }

    const uploadErrors = getUploadErrors()
    if (uploadErrors.length > 0) {
      Swal.fire('Validation', uploadErrors.join(' '), 'warning')
      return
    }

    await confirmFormSubmit(buildFormConfirmOptions(isEdit ? 'update' : 'create', { subject: 'this product' }), async () => {
      try {
        setSaving(true)
        const formData = buildFormData(data)
        const result = isEdit ? await updateShopProduct(product._id, formData) : await createShopProduct(formData)
        const savedId = result?.product?._id ?? product?._id

        setSaved(true)
        acknowledgeSuccessfulFormSave()
        await Swal.fire(isEdit ? 'Saved' : 'Created', `Product ${isEdit ? 'updated' : 'created'} successfully.`, 'success')
        navigate(savedId ? `/ecommerce/products/${savedId}` : '/ecommerce/products')
      } catch (error) {
        Swal.fire('Error', error?.response?.data?.message || 'Failed to save product', 'error')
      } finally {
        setSaving(false)
      }
    })
  }

  const handleRemoveGalleryImage = async (url) => {
    if (busy) return
    await confirmFormSubmit(
      buildFormConfirmOptions('delete', {
        subject: 'this gallery image',
        text: 'The image is removed from the product immediately, without saving the rest of the form.',
      }),
      async () => {
        try {
          setRemovingUrl(url)
          await deleteShopProductGalleryImage(product._id, url)
          setExistingGallery((current) => current.filter((item) => item !== url))
        } catch (error) {
          Swal.fire('Error', error?.response?.data?.message || 'Failed to remove image', 'error')
        } finally {
          setRemovingUrl(null)
        }
      },
    )
  }

  const cancelTo = isEdit ? `/ecommerce/products/${product._id}` : '/ecommerce/products'
  const submitDisabled = busy || !isDirty

  return (
    <form className="product-form" noValidate onSubmit={handleSubmit(onSubmit, onInvalid)}>
      <fieldset disabled={busy} className="border-0 p-0 m-0" style={{ minWidth: 0 }}>
        <Row>
          <Col lg={8}>
            <ComponentContainerCard id="product-general" title="General" description="The basics shoppers see on the storefront.">
              <TextFormInput
                control={control}
                name="title"
                label={
                  <RequiredFormLabel htmlFor="title" required>
                    Title
                  </RequiredFormLabel>
                }
                placeholder="e.g. Architect's scale ruler 1:100"
                containerClassName="mb-3"
                autoComplete="off"
              />
              <TextFormInput
                control={control}
                name="excerpt"
                label="Short description"
                as="textarea"
                rows={2}
                placeholder="One or two lines shown on product cards"
                containerClassName="mb-1"
              />
              <p className="text-muted small text-end mb-3">{(formValues.excerpt || '').length} characters · 160 or fewer reads best on cards</p>
              <div className="mb-1">
                <Form.Label>Description</Form.Label>
                <Controller
                  name="descQuill"
                  control={control}
                  render={({ field }) => (
                    <ReactQuill
                      theme="snow"
                      value={field.value}
                      onChange={field.onChange}
                      modules={QUILL_MODULES}
                      readOnly={busy}
                      placeholder="Materials, dimensions, what's in the box, care instructions…"
                    />
                  )}
                />
              </div>
            </ComponentContainerCard>

            <div className="mt-3">
              <ComponentContainerCard id="product-pricing" title="Pricing" description="Prices are in US dollars.">
                <Row>
                  <Col md={6}>
                    <NumberField
                      control={control}
                      name="price"
                      label="Price"
                      required
                      prefix="$"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                    />
                  </Col>
                  <Col md={6}>
                    <NumberField
                      control={control}
                      name="salePrice"
                      label="Sale price"
                      prefix="$"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      help="Optional. Leave at 0 for no sale."
                    />
                  </Col>
                </Row>
                {pricePreview && (
                  <div className="rounded bg-light bg-opacity-50 border px-3 py-2 d-flex flex-wrap align-items-center gap-2" aria-live="polite">
                    <span className="text-muted">Shoppers pay</span>
                    <strong>{formatMoney(pricePreview.current)}</strong>
                    {pricePreview.original != null && (
                      <>
                        <del className="text-muted">{formatMoney(pricePreview.original)}</del>
                        <Badge bg="success">{pricePreview.percentOff}% off</Badge>
                      </>
                    )}
                  </div>
                )}
              </ComponentContainerCard>
            </div>

            <div className="mt-3">
              <ComponentContainerCard id="product-inventory" title="Inventory" description="Choose whether this product has a limited quantity.">
                <Controller
                  name="trackInventory"
                  control={control}
                  render={({ field }) => (
                    <FormCheck
                      type="switch"
                      id="trackInventory"
                      label="Track stock for this product"
                      checked={Boolean(field.value)}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="mb-3"
                    />
                  )}
                />
                {formValues.trackInventory ? (
                  <Row>
                    <Col md={6}>
                      <NumberField
                        control={control}
                        name="stockQuantity"
                        label="Stock on hand"
                        required
                        placeholder="0"
                        min="0"
                        step="1"
                        containerClassName="mb-0"
                      />
                    </Col>
                    <Col md={6}>
                      <NumberField
                        control={control}
                        name="lowStockThreshold"
                        label="Low stock alert"
                        required
                        placeholder="5"
                        min="1"
                        step="1"
                        help="Highlighted on the products list at or below this level."
                        containerClassName="mb-0"
                      />
                    </Col>
                  </Row>
                ) : (
                  <p className="text-muted mb-0">Stock isn&apos;t tracked, so shoppers can always order this product.</p>
                )}
              </ComponentContainerCard>
            </div>
          </Col>

          <Col lg={4} className="mt-3 mt-lg-0">
            <ComponentContainerCard id="product-publishing" title="Publishing" description="Control visibility and where it appears.">
              <SelectFormInput
                control={control}
                name="status"
                label="Status"
                options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                isSearchable={false}
                isDisabled={busy}
                containerClassName="mb-1"
              />
              <p className="text-muted small mb-3">{STATUS_HINTS[formValues.status]}</p>
              <NumberField
                control={control}
                name="sortOrder"
                label="Display order"
                required
                placeholder="999"
                min="1"
                step="1"
                help="Lower numbers appear first."
              />
              <Controller
                name="featured"
                control={control}
                render={({ field }) => (
                  <FormCheck
                    type="switch"
                    id="featured"
                    label="Featured product"
                    checked={Boolean(field.value)}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
            </ComponentContainerCard>

            <div className="mt-3">
              <ProductMediaCard
                isEdit={isEdit}
                thumbnailUrl={product?.thumbnailUrl}
                existingGallery={existingGallery}
                removingUrl={removingUrl}
                disabled={busy}
                thumbnailError={thumbnailError}
                onThumbnailChange={handleThumbnailChange}
                onGalleryChange={setGalleryFiles}
                onRemoveGalleryImage={handleRemoveGalleryImage}
              />
            </div>

            <div className="mt-3">
              <ComponentContainerCard id="product-categories" title="Categories" description="Helps shoppers filter the storefront.">
                <Controller
                  name="categoryIds"
                  control={control}
                  render={({ field }) => (
                    <ReactSelect
                      inputId="categoryIds"
                      isMulti
                      isLoading={categoriesLoading}
                      isDisabled={busy}
                      classNamePrefix="react-select"
                      options={categoryOptions}
                      value={categoryOptions.filter((option) => (field.value || []).includes(option.value))}
                      onChange={(selected) => field.onChange((selected || []).map((option) => option.value))}
                      placeholder="Select categories…"
                      noOptionsMessage={() => 'No categories available'}
                    />
                  )}
                />
                {!categoriesLoading && categories.length === 0 && (
                  <p className="text-muted small mt-2 mb-0">
                    No categories yet. <Link to="/ecommerce/shop/categories">Create one</Link> to help shoppers filter the storefront.
                  </p>
                )}
              </ComponentContainerCard>
            </div>
          </Col>
        </Row>

        <Card className="sticky-bottom shadow-sm mt-3 mb-0">
          <CardBody className="py-2 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <span className="text-muted small" aria-live="polite">
              {busy
                ? 'Working…'
                : isDirty
                  ? 'You have unsaved changes'
                  : isEdit
                    ? 'No changes to save'
                    : 'Fill in the required fields to create the product'}
            </span>
            <div className="d-flex gap-2">
              <Button type="button" variant="light" disabled={busy} onClick={() => navigate(cancelTo)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitDisabled}>
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    {isEdit ? 'Saving…' : 'Creating…'}
                  </>
                ) : isEdit ? (
                  'Save changes'
                ) : (
                  'Create product'
                )}
              </Button>
            </div>
          </CardBody>
        </Card>
      </fieldset>
    </form>
  )
}

export default GeneralDetailsForm
