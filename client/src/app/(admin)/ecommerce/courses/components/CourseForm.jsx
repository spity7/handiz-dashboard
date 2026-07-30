import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Button, Card, Col, Form, InputGroup, Row, Spinner } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import ThumbnailDropzoneInput from '@/components/form/ThumbnailDropzoneInput'
import RequiredFormLabel from '@/components/form/RequiredFormLabel'
import { useAuthContext } from '@/context/useAuthContext'
import { useUnsavedFormChanges } from '@/context/UnsavedFormChangesContext'
import { useGlobalContext } from '@/context/useGlobalContext'
import InstructorSelect from './InstructorSelect'
import CourseMarketingVideosEditor from './CourseMarketingVideosEditor'
import CourseAboutCourseEditor from './CourseAboutCourseEditor'
import { marketingVideosFormDirty, marketingVideosFromCourse, serializeMarketingVideosForApi } from '../utils/courseMarketingVideos'
import { aboutCourseSectionsFormDirty, aboutCourseSectionsFromCourse, serializeAboutCourseSectionsForApi } from '../utils/courseAboutSections'
import {
  DISCOUNT_TYPE,
  MIN_PAID_COURSE_PRICE,
  clampDiscountValue,
  clampNonNegativeNumber,
  formatDiscountEndsAt,
  formatUsd,
  getDiscountValueBounds,
  getFreeOfferPostExpiryPrice,
  hasCompareAtPrice,
  previewPricing,
  toDatetimeLocalValue,
} from '@/utils/coursePricing'
import useConfirmFormSubmit from '@/hooks/useConfirmFormSubmit'
import { buildFormConfirmOptions } from '@/utils/formConfirm'
import useRegisterUnsavedFormDirty from '@/hooks/useRegisterUnsavedFormDirty'
import { formsDiffer } from '@/utils/formDirtyCompare'
import { pickComparableFormValues } from '@/utils/formFieldCompare'

const apiErrorMessage = (error, fallback) => {
  const data = error?.response?.data
  if (data == null) return error?.message || fallback
  if (typeof data === 'string') return data.trim() || fallback
  if (typeof data.message === 'string') return data.message
  if (typeof data.error === 'string') return data.error
  return fallback
}

const sameId = (a, b) => String(a ?? '') === String(b ?? '')

const normalizeTags = (tags) => {
  const values = Array.isArray(tags)
    ? tags
    : String(tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)

  return [...new Set(values.map((tag) => tag.trim()).filter(Boolean))].sort().join(', ')
}

const normalizePrice = (price, isFree) => {
  if (isFree) {
    if (price === '' || price === null || price === undefined) return ''
    const num = Number(price)
    if (!Number.isFinite(num) || num <= 0) return ''
    return num
  }
  const num = Number(price)
  return Number.isFinite(num) ? num : 0
}

const normalizeHeroHighlights = (highlights) => {
  const values = Array.isArray(highlights)
    ? highlights
    : String(highlights || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)

  return [...new Set(values.map((item) => item.trim()).filter(Boolean))]
}

const serializeHeroHighlights = (highlights) => normalizeHeroHighlights(highlights).join('\n')

const emptyCourseFormValues = (currentUser) => ({
  title: '',
  excerpt: '',
  description: '',
  level: 'Beginner',
  heroHighlights: '',
  order: 999,
  isFree: true,
  price: '',
  discountEnabled: false,
  discountType: DISCOUNT_TYPE.PERCENT,
  discountValue: 0,
  discountHasExpiry: false,
  discountEndsAt: '',
  freeHasExpiry: false,
  freeEndsAt: '',
  status: 'Draft',
  tags: '',
  instructorId: String(currentUser?._id || ''),
})

const buildFormValuesFromCourse = (course, currentUser) => {
  if (!course) return emptyCourseFormValues(currentUser)

  const instructorId = typeof course.instructorId === 'object' ? course.instructorId._id : course.instructorId || currentUser?._id || ''

  return {
    title: course.title || '',
    excerpt: course.excerpt || '',
    description: course.description || '',
    level: course.level || 'Beginner',
    heroHighlights: serializeHeroHighlights(course.heroHighlights || []),
    order: Number(course.order ?? 999),
    isFree: course.pricing?.isFree ?? true,
    price: course.pricing?.isFree ? course.pricing?.price ?? '' : course.pricing?.price ?? 0,
    discountEnabled: course.pricing?.discount?.enabled ?? false,
    discountType: course.pricing?.discount?.type || DISCOUNT_TYPE.PERCENT,
    discountValue: Number(course.pricing?.discount?.value ?? 0),
    discountHasExpiry: Boolean(course.pricing?.discount?.endsAt),
    discountEndsAt: toDatetimeLocalValue(course.pricing?.discount?.endsAt),
    freeHasExpiry: Boolean(course.pricing?.freeEndsAt),
    freeEndsAt: toDatetimeLocalValue(course.pricing?.freeEndsAt),
    status: course.status || 'Draft',
    tags: normalizeTags(course.tags || []),
    instructorId: String(instructorId || ''),
  }
}

const getComparableFormValues = (form) => ({
  title: form.title || '',
  excerpt: form.excerpt || '',
  description: form.description || '',
  level: form.level || 'Beginner',
  heroHighlights: serializeHeroHighlights(form.heroHighlights),
  order: Number(form.order ?? 999),
  isFree: Boolean(form.isFree),
  price: normalizePrice(form.price, form.isFree),
  discountEnabled: Boolean(form.discountEnabled),
  discountType: form.discountType || DISCOUNT_TYPE.PERCENT,
  discountValue: Number(form.discountValue ?? 0),
  discountHasExpiry: Boolean(form.discountHasExpiry),
  discountEndsAt: form.discountEndsAt || '',
  freeHasExpiry: Boolean(form.freeHasExpiry),
  freeEndsAt: form.freeEndsAt || '',
  status: form.status || 'Draft',
  tags: normalizeTags(form.tags),
  instructorId: String(form.instructorId || ''),
})

const courseFormSavedToRawShape = (saved) => ({
  title: saved.title ?? '',
  excerpt: saved.excerpt ?? '',
  description: saved.description ?? '',
  level: saved.level ?? 'Beginner',
  heroHighlights: saved.heroHighlights ?? '',
  order: saved.order ?? 999,
  isFree: saved.isFree ?? true,
  price: saved.price ?? '',
  discountEnabled: saved.discountEnabled ?? false,
  discountType: saved.discountType || DISCOUNT_TYPE.PERCENT,
  discountValue: saved.discountValue ?? 0,
  discountHasExpiry: saved.discountHasExpiry ?? false,
  discountEndsAt: saved.discountEndsAt ?? '',
  freeHasExpiry: saved.freeHasExpiry ?? false,
  freeEndsAt: saved.freeEndsAt ?? '',
  status: saved.status ?? 'Draft',
  tags: typeof saved.tags === 'string' ? saved.tags : normalizeTags(saved.tags),
  instructorId: saved.instructorId ?? '',
})

const buildComparableFromSaved = (saved) => {
  const keys = Object.keys(saved)
  const comparable = getComparableFormValues(courseFormSavedToRawShape(saved))
  return pickComparableFormValues(comparable, keys, saved)
}

const buildInitialCourseFormState = (course, currentUser) => {
  const saved = buildFormValuesFromCourse(course, currentUser)
  return {
    title: saved.title,
    excerpt: saved.excerpt,
    description: saved.description,
    level: saved.level,
    heroHighlights: saved.heroHighlights,
    order: saved.order,
    isFree: saved.isFree,
    price: saved.price,
    discountEnabled: saved.discountEnabled,
    discountType: saved.discountType,
    discountValue: saved.discountValue,
    discountHasExpiry: saved.discountHasExpiry,
    discountEndsAt: saved.discountEndsAt,
    freeHasExpiry: saved.freeHasExpiry,
    freeEndsAt: saved.freeEndsAt,
    status: saved.status,
    tags: course ? (course.tags || []).join(', ') : '',
    instructorId: saved.instructorId,
  }
}

const courseFormHasChanges = (
  form,
  saved,
  { hasNewThumbnail, hasNewHeroDesktop, hasNewHeroMobile, marketingVideos, savedMarketingVideos, aboutCourseSections, savedAboutCourseSections },
) => {
  if (hasNewThumbnail || hasNewHeroDesktop || hasNewHeroMobile) return true
  if (marketingVideosFormDirty(marketingVideos, savedMarketingVideos)) return true
  if (aboutCourseSectionsFormDirty(aboutCourseSections, savedAboutCourseSections)) return true
  if (!saved) return false
  return formsDiffer(buildComparableFromSaved(saved), buildComparableFromForm(form, saved))
}

const buildComparableFromForm = (form, referenceSaved) => {
  const keys = Object.keys(referenceSaved)
  const comparable = getComparableFormValues(form)
  return pickComparableFormValues(comparable, keys, referenceSaved)
}

const CourseForm = ({ course = null, onSaved, disabled = false }) => {
  const { createCourse, updateCourse } = useGlobalContext()
  const { user: currentUser, loading: authLoading } = useAuthContext()
  const { acknowledgeSuccessfulFormSave } = useUnsavedFormChanges()
  const navigate = useNavigate()
  const confirmFormSubmit = useConfirmFormSubmit()
  const isEditing = Boolean(course?._id)
  const canPublish = (course?.lessonCount ?? 0) > 0
  const instructorUser = useMemo(() => {
    if (course?.instructorId && typeof course.instructorId === 'object') return course.instructorId
    if (!isEditing && currentUser) return currentUser
    return null
  }, [course?.instructorId, currentUser, isEditing])
  const [loading, setLoading] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [heroImageDesktopFile, setHeroImageDesktopFile] = useState(null)
  const [heroImageMobileFile, setHeroImageMobileFile] = useState(null)
  const [marketingVideos, setMarketingVideos] = useState(() => marketingVideosFromCourse(course?.marketingVideos))
  const [aboutCourseSections, setAboutCourseSections] = useState(() => aboutCourseSectionsFromCourse(course?.aboutCourseSections))
  const [form, setForm] = useState(() => buildInitialCourseFormState(course, currentUser))

  const savedMarketingVideos = useMemo(() => marketingVideosFromCourse(course?.marketingVideos), [course?._id, course?.marketingVideos])
  const savedAboutCourseSections = useMemo(
    () => aboutCourseSectionsFromCourse(course?.aboutCourseSections),
    [course?._id, course?.aboutCourseSections],
  )

  useEffect(() => {
    setMarketingVideos(marketingVideosFromCourse(course?.marketingVideos))
  }, [course?._id, course?.marketingVideos])

  useEffect(() => {
    setAboutCourseSections(aboutCourseSectionsFromCourse(course?.aboutCourseSections))
  }, [course?._id, course?.aboutCourseSections])

  useEffect(() => {
    if (!course?.status) return
    setForm((prev) => (prev.status === course.status ? prev : { ...prev, status: course.status }))
  }, [course?.status])

  useLayoutEffect(() => {
    if (isEditing || !currentUser?._id) return
    const nextInstructorId = String(currentUser._id)
    setForm((prev) => (sameId(prev.instructorId, nextInstructorId) ? prev : { ...prev, instructorId: nextInstructorId }))
  }, [isEditing, currentUser?._id])

  const hasThumbnail = Boolean(thumbnailFile) || Boolean(course?.thumbnailUrl)
  const hasHeroDesktop = Boolean(heroImageDesktopFile) || Boolean(course?.heroImageDesktopUrl)
  const hasHeroMobile = Boolean(heroImageMobileFile) || Boolean(course?.heroImageMobileUrl)

  const discountBounds = useMemo(() => getDiscountValueBounds(form.price, form.discountType), [form.price, form.discountType])

  const canSaveFreeExpiration = hasCompareAtPrice(form.price)
  const freeOfferPostExpiryPrice = getFreeOfferPostExpiryPrice(form.price)

  const pricingPreview = useMemo(
    () =>
      previewPricing({
        isFree: form.isFree,
        price: form.price,
        discountEnabled: form.discountEnabled,
        discountType: form.discountType,
        discountValue: form.discountValue,
        discountHasExpiry: form.discountHasExpiry,
        discountEndsAt: form.discountEndsAt,
        freeHasExpiry: form.freeHasExpiry,
        freeEndsAt: form.freeEndsAt,
      }),
    [
      form.isFree,
      form.price,
      form.discountEnabled,
      form.discountType,
      form.discountValue,
      form.discountHasExpiry,
      form.discountEndsAt,
      form.freeHasExpiry,
      form.freeEndsAt,
    ],
  )

  const currentUserId = currentUser?._id

  const savedFormValues = useMemo(() => buildFormValuesFromCourse(course, currentUser), [course, currentUserId])

  const dirtyReference = savedFormValues

  const dirtySnapshot = useMemo(() => buildComparableFromSaved(dirtyReference), [dirtyReference])

  const dirtyCurrent = useMemo(() => buildComparableFromForm(form, dirtyReference), [form, dirtyReference])

  const createInstructorSynced = !currentUserId || sameId(form.instructorId, currentUserId)

  const hasChanges = useMemo(
    () =>
      courseFormHasChanges(form, savedFormValues, {
        hasNewThumbnail: Boolean(thumbnailFile),
        hasNewHeroDesktop: Boolean(heroImageDesktopFile),
        hasNewHeroMobile: Boolean(heroImageMobileFile),
        marketingVideos,
        savedMarketingVideos,
        aboutCourseSections,
        savedAboutCourseSections,
      }),
    [
      form,
      savedFormValues,
      thumbnailFile,
      heroImageDesktopFile,
      heroImageMobileFile,
      marketingVideos,
      savedMarketingVideos,
      aboutCourseSections,
      savedAboutCourseSections,
    ],
  )

  useRegisterUnsavedFormDirty(dirtySnapshot, dirtyCurrent, {
    enabled: !disabled && !authLoading && (isEditing || createInstructorSynced),
    extraDirty:
      Boolean(thumbnailFile) ||
      Boolean(heroImageDesktopFile) ||
      Boolean(heroImageMobileFile) ||
      marketingVideosFormDirty(marketingVideos, savedMarketingVideos) ||
      aboutCourseSectionsFormDirty(aboutCourseSections, savedAboutCourseSections),
    trackingMode: isEditing ? 'snapshot' : 'defaults',
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }
      if (name === 'isFree' && checked) {
        next.discountEnabled = false
        next.discountValue = 0
        next.discountHasExpiry = false
        next.discountEndsAt = ''
      }
      if (name === 'discountEnabled' && !checked) {
        next.discountValue = 0
        next.discountHasExpiry = false
        next.discountEndsAt = ''
      }
      if (name === 'discountHasExpiry' && !checked) {
        next.discountEndsAt = ''
      }
      if (name === 'freeHasExpiry' && !checked) {
        next.freeEndsAt = ''
      }
      if (name === 'price') {
        next.price = clampNonNegativeNumber(value)
      }
      if (name === 'price' || name === 'discountType') {
        const price = name === 'price' ? value : prev.price
        const discountType = name === 'discountType' ? value : prev.discountType
        const bounds = getDiscountValueBounds(price, discountType)
        if (!bounds.canDiscount) {
          next.discountEnabled = false
          next.discountValue = 0
        } else {
          next.discountValue = clampDiscountValue(price, discountType, prev.discountValue)
        }
      }
      if (name === 'discountValue') {
        next.discountValue = clampDiscountValue(prev.price, prev.discountType, clampNonNegativeNumber(value, { allowEmpty: false }))
      }
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!hasThumbnail) {
      Swal.fire('Validation', 'Course thumbnail is required.', 'warning')
      return
    }

    if (!hasHeroDesktop) {
      Swal.fire('Validation', 'Desktop hero image is required.', 'warning')
      return
    }

    if (!hasHeroMobile) {
      Swal.fire('Validation', 'Mobile hero image is required.', 'warning')
      return
    }

    const listPrice = Number(form.price)

    if (Number.isFinite(listPrice) && listPrice < 0) {
      Swal.fire('Validation', 'Price cannot be negative.', 'warning')
      return
    }

    if (!form.isFree && (!Number.isFinite(listPrice) || listPrice < MIN_PAID_COURSE_PRICE)) {
      Swal.fire('Validation', `Paid courses must have a list price of at least ${formatUsd(MIN_PAID_COURSE_PRICE)}.`, 'warning')
      return
    }

    if (!form.isFree && form.discountEnabled) {
      if (!discountBounds.canDiscount) {
        Swal.fire('Validation', discountBounds.hint, 'warning')
        return
      }

      const value = Number(form.discountValue)
      if (!Number.isFinite(value) || value < 0) {
        Swal.fire('Validation', 'Discount value cannot be negative.', 'warning')
        return
      }
      if (value < discountBounds.min || value > discountBounds.max) {
        Swal.fire('Validation', discountBounds.hint, 'warning')
        return
      }
      if (pricingPreview.salePrice < MIN_PAID_COURSE_PRICE) {
        Swal.fire('Validation', `Discount is too large. Minimum checkout price is ${formatUsd(MIN_PAID_COURSE_PRICE)}.`, 'warning')
        return
      }
      if (form.discountHasExpiry) {
        const endsAt = new Date(form.discountEndsAt)
        if (!form.discountEndsAt || Number.isNaN(endsAt.getTime())) {
          Swal.fire('Validation', 'Please choose a valid discount end date.', 'warning')
          return
        }
        if (endsAt.getTime() <= Date.now()) {
          Swal.fire('Validation', 'Discount end date must be in the future.', 'warning')
          return
        }
      }
    }

    if (form.isFree && form.freeHasExpiry && canSaveFreeExpiration) {
      const endsAt = new Date(form.freeEndsAt)
      if (!form.freeEndsAt || Number.isNaN(endsAt.getTime())) {
        Swal.fire('Validation', 'Please choose a valid free offer end date.', 'warning')
        return
      }
      if (endsAt.getTime() <= Date.now()) {
        Swal.fire('Validation', 'Free offer end date must be in the future.', 'warning')
        return
      }
    }

    const submitCourse = async () => {
      setLoading(true)
      try {
        const formData = new FormData()
        const freeHasExpiryToSave = form.isFree && canSaveFreeExpiration && form.freeHasExpiry
        Object.entries(form).forEach(([key, value]) => {
          if (key === 'freeHasExpiry') {
            formData.append(key, freeHasExpiryToSave ? 'true' : 'false')
            return
          }
          if (key === 'freeEndsAt') {
            if (freeHasExpiryToSave && value) formData.append(key, value)
            return
          }
          if (key === 'tags') {
            formData.append(
              'tags',
              JSON.stringify(
                value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              ),
            )
          } else if (key === 'heroHighlights') {
            formData.append('heroHighlights', JSON.stringify(normalizeHeroHighlights(value)))
          } else if (key === 'instructorId') {
            if (String(value).trim()) formData.append(key, String(value).trim())
          } else if (key === 'price' && form.isFree && (value === '' || value === null)) {
            formData.append(key, '0')
          } else {
            formData.append(key, value)
          }
        })
        if (thumbnailFile) formData.append('thumbnail', thumbnailFile)
        if (heroImageDesktopFile) formData.append('heroImageDesktop', heroImageDesktopFile)
        if (heroImageMobileFile) formData.append('heroImageMobile', heroImageMobileFile)
        formData.append('marketingVideos', JSON.stringify(serializeMarketingVideosForApi(marketingVideos)))
        formData.append('aboutCourseSections', JSON.stringify(serializeAboutCourseSectionsForApi(aboutCourseSections)))

        if (course?._id) {
          await updateCourse(course._id, formData)
          setThumbnailFile(null)
          setHeroImageDesktopFile(null)
          setHeroImageMobileFile(null)
          acknowledgeSuccessfulFormSave()
          onSaved?.()
          await Swal.fire('Saved', 'Course updated successfully.', 'success')
        } else {
          const result = await createCourse(formData)
          setThumbnailFile(null)
          setHeroImageDesktopFile(null)
          setHeroImageMobileFile(null)
          acknowledgeSuccessfulFormSave()
          await Swal.fire('Created', 'Course created successfully.', 'success')
          navigate(`/ecommerce/courses/edit/${result.course._id}`)
        }
      } catch (error) {
        Swal.fire('Error', apiErrorMessage(error, 'Failed to save course'), 'error')
      } finally {
        setLoading(false)
      }
    }

    await confirmFormSubmit(buildFormConfirmOptions(isEditing ? 'update' : 'create', { subject: 'this course' }), submitCourse)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <RequiredFormLabel htmlFor="course-title" required>
              Title
            </RequiredFormLabel>
            <Form.Control
              id="course-title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Introduction to Web Development"
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Excerpt</Form.Label>
            <Form.Control name="excerpt" value={form.excerpt} onChange={handleChange} placeholder="Short summary shown on the course catalog" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="What students will learn, prerequisites, and course details"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <ThumbnailDropzoneInput
            label="Thumbnail"
            required
            text="Upload course thumbnail (required, 1 image only)"
            showPreview
            onFileUpload={(files) => setThumbnailFile(files[0] || null)}
          />
          {course?.thumbnailUrl && !thumbnailFile && <img src={course.thumbnailUrl} alt="" className="img-fluid rounded mt-2" />}
        </Col>
      </Row>

      <Card className="mb-4 border">
        <Card.Header className="bg-light fw-semibold">Course page hero images</Card.Header>
        <Card.Body>
          <p className="text-muted mb-4">
            Required background images for the course detail page. Use a wide landscape image for desktop (16:9 or 21:9, subject on the right) and a
            taller crop for mobile (4:5 or 9:16, subject in the upper area). The catalog thumbnail above is still used on course cards and listings.
          </p>
          <Row>
            <Col md={6}>
              <ThumbnailDropzoneInput
                label="Desktop hero image"
                required
                text="Upload desktop hero background (required)"
                showPreview
                onFileUpload={(files) => setHeroImageDesktopFile(files[0] || null)}
              />
              {course?.heroImageDesktopUrl && !heroImageDesktopFile && (
                <img src={course.heroImageDesktopUrl} alt="" className="img-fluid rounded mt-2" />
              )}
            </Col>
            <Col md={6}>
              <ThumbnailDropzoneInput
                label="Mobile hero image"
                required
                text="Upload mobile hero background (required)"
                showPreview
                onFileUpload={(files) => setHeroImageMobileFile(files[0] || null)}
              />
              {course?.heroImageMobileUrl && !heroImageMobileFile && (
                <img src={course.heroImageMobileUrl} alt="" className="img-fluid rounded mt-2" />
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <CourseMarketingVideosEditor videos={marketingVideos} onChange={setMarketingVideos} />

      <CourseAboutCourseEditor sections={aboutCourseSections} onChange={setAboutCourseSections} />

      <Card className="mb-4 border">
        <Card.Header className="bg-light fw-semibold">Course page highlights</Card.Header>
        <Card.Body>
          <p className="text-muted mb-3">
            Bullet points shown on the course detail hero panel. Leave empty to auto-generate from lesson count, duration, and default perks.
          </p>
          <Form.Group>
            <Form.Label>Hero highlights</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              name="heroHighlights"
              value={form.heroHighlights}
              onChange={handleChange}
              placeholder={'e.g. 10+ step-by-step video lessons\nSelf-paced — learn anytime\nLifetime access\nCertificate of completion'}
            />
            <Form.Text muted>Enter one highlight per line.</Form.Text>
          </Form.Group>
        </Card.Body>
      </Card>

      <Row>
        <Col md={3}>
          <Form.Group className="mb-3">
            <Form.Label>Level</Form.Label>
            <Form.Select name="level" value={form.level} onChange={handleChange}>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group className="mb-3">
            <Form.Label>Status</Form.Label>
            <Form.Select name="status" value={form.status} onChange={handleChange}>
              <option value="Draft">Draft</option>
              <option value="Coming Soon">Coming Soon</option>
              {isEditing && (
                <option value="Published" disabled={!canPublish}>
                  Published
                </option>
              )}
              {isEditing && <option value="Archived">Archived</option>}
            </Form.Select>
            {!isEditing && (
              <Form.Text muted className="d-block mt-1">
                Choose Coming Soon to list the course on the public catalog before lessons are ready.
              </Form.Text>
            )}
            {isEditing && !canPublish && form.status !== 'Coming Soon' && (
              <Form.Text muted className="d-block mt-1">
                Publish becomes available after at least one lesson is published.
              </Form.Text>
            )}
            {form.status === 'Coming Soon' && (
              <Form.Text muted className="d-block mt-1">
                Coming soon courses appear on /courses but are not clickable.
              </Form.Text>
            )}
            {course?.publishedAt && (
              <Form.Text muted className="d-block mt-1">
                First published {formatDiscountEndsAt(course.publishedAt)}
                {course.lastPublishedAt &&
                  course.lastPublishedAt !== course.publishedAt &&
                  ` · Last published ${formatDiscountEndsAt(course.lastPublishedAt)}`}
              </Form.Text>
            )}
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group className="mb-3">
            <Form.Label>Order</Form.Label>
            <Form.Control type="number" name="order" value={form.order} onChange={handleChange} placeholder="Lower numbers appear first" />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group className="mb-3">
            <Form.Label>Tags (comma-separated)</Form.Label>
            <Form.Control name="tags" value={form.tags} onChange={handleChange} placeholder="e.g. design, beginner, marketing" />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Instructor</Form.Label>
            <InstructorSelect
              value={form.instructorId}
              selectedUser={instructorUser}
              disabled={disabled || loading}
              onChange={(instructorId) => setForm((prev) => ({ ...prev, instructorId: String(instructorId || '') }))}
            />
          </Form.Group>
        </Col>
      </Row>

      <Card className="mb-4 border">
        <Card.Header className="bg-light fw-semibold">Pricing</Card.Header>
        <Card.Body>
          <Form.Check
            type="switch"
            id="offer-free"
            label="Offer this course for free"
            name="isFree"
            checked={form.isFree}
            onChange={handleChange}
            className="mb-1"
          />
          <Form.Text muted className="d-block mb-4">
            {form.isFree
              ? 'Students enroll at no cost. Add an original price below to show a limited-time free promotion.'
              : 'Students pay at checkout. Toggle above to make the course free instead of using a 100% discount.'}
          </Form.Text>

          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Group>
                <RequiredFormLabel htmlFor="course-list-price" required={!form.isFree}>
                  {form.isFree ? 'Original price (compare-at)' : 'List price (USD)'}
                </RequiredFormLabel>
                <InputGroup>
                  <InputGroup.Text>$</InputGroup.Text>
                  <Form.Control
                    id="course-list-price"
                    type="number"
                    step="0.01"
                    min={0}
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder={form.isFree ? '10.00 (optional)' : '49.99'}
                    required={!form.isFree}
                  />
                </InputGroup>
                <Form.Text muted>
                  {form.isFree
                    ? 'Optional. Shown crossed out on the storefront.'
                    : `Standard price before any discount. Minimum checkout is ${formatUsd(MIN_PAID_COURSE_PRICE)}.`}
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          {form.isFree && (
            <>
              <hr className="my-4" />
              <Form.Check
                type="switch"
                id="free-has-expiry"
                label="Set free offer expiration"
                name="freeHasExpiry"
                checked={form.freeHasExpiry}
                onChange={handleChange}
                disabled={!canSaveFreeExpiration}
                className="mb-3"
              />
              {!canSaveFreeExpiration && (
                <Form.Text muted className="d-block mb-3">
                  Set a compare-at price to schedule an end date.
                </Form.Text>
              )}
              {form.freeHasExpiry && (
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group>
                      <RequiredFormLabel htmlFor="course-free-ends-at" required={canSaveFreeExpiration}>
                        Free offer ends on
                      </RequiredFormLabel>
                      <Form.Control
                        id="course-free-ends-at"
                        type="datetime-local"
                        name="freeEndsAt"
                        value={form.freeEndsAt}
                        onChange={handleChange}
                        min={toDatetimeLocalValue(new Date())}
                        required={canSaveFreeExpiration}
                        disabled={!canSaveFreeExpiration}
                      />
                      <Form.Text muted>
                        {canSaveFreeExpiration
                          ? `After this date, students pay ${formatUsd(freeOfferPostExpiryPrice)}.`
                          : 'Add a compare-at price to save this end date.'}
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              )}
            </>
          )}

          {!form.isFree && (
            <>
              <hr className="my-4" />

              <Form.Check
                type="switch"
                id="discount-enabled"
                label="Offer a promotional discount"
                name="discountEnabled"
                checked={form.discountEnabled}
                onChange={handleChange}
                disabled={!discountBounds.canDiscount}
                className="mb-3"
              />
              {!discountBounds.canDiscount && (
                <Form.Text muted className="d-block mb-3">
                  {discountBounds.hint}
                </Form.Text>
              )}

              {form.discountEnabled && discountBounds.canDiscount && (
                <Row className="g-3 align-items-end">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Discount type</Form.Label>
                      <Form.Select name="discountType" value={form.discountType} onChange={handleChange}>
                        <option value={DISCOUNT_TYPE.PERCENT}>Percentage off</option>
                        <option value={DISCOUNT_TYPE.FIXED}>Fixed amount off</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <RequiredFormLabel htmlFor="course-discount-value" required>
                        Discount value
                      </RequiredFormLabel>
                      {form.discountType === DISCOUNT_TYPE.PERCENT ? (
                        <InputGroup>
                          <Form.Control
                            id="course-discount-value"
                            type="number"
                            step="1"
                            min={discountBounds.min}
                            max={discountBounds.max}
                            name="discountValue"
                            value={form.discountValue}
                            onChange={handleChange}
                            placeholder="e.g. 20"
                            required
                          />
                          <InputGroup.Text>%</InputGroup.Text>
                        </InputGroup>
                      ) : (
                        <InputGroup>
                          <InputGroup.Text>$</InputGroup.Text>
                          <Form.Control
                            id="course-discount-value"
                            type="number"
                            step="1"
                            min={discountBounds.min}
                            max={discountBounds.max}
                            name="discountValue"
                            value={form.discountValue}
                            onChange={handleChange}
                            placeholder="e.g. 10"
                            required
                          />
                        </InputGroup>
                      )}
                      <Form.Text muted>{discountBounds.hint}</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Check
                      type="switch"
                      id="discount-has-expiry"
                      label="Set discount expiration"
                      name="discountHasExpiry"
                      checked={form.discountHasExpiry}
                      onChange={handleChange}
                      className="mb-2"
                    />
                    {form.discountHasExpiry && (
                      <Row className="g-3">
                        <Col md={4}>
                          <Form.Group>
                            <RequiredFormLabel htmlFor="course-discount-ends-at" required>
                              Ends on
                            </RequiredFormLabel>
                            <Form.Control
                              id="course-discount-ends-at"
                              type="datetime-local"
                              name="discountEndsAt"
                              value={form.discountEndsAt}
                              onChange={handleChange}
                              min={toDatetimeLocalValue(new Date())}
                              required
                            />
                            <Form.Text muted>After this date, students pay the list price. Time uses your local timezone.</Form.Text>
                          </Form.Group>
                        </Col>
                      </Row>
                    )}
                  </Col>
                </Row>
              )}
            </>
          )}

          <div className="mt-4 p-3 rounded bg-light border">
            <div className="fw-semibold mb-2">Storefront preview</div>
            {form.isFree ? (
              pricingPreview.freeOfferExpired ? (
                <div>
                  <div className="alert alert-warning py-2 mb-2">
                    This free offer has expired
                    {course?.pricing?.freeEndsAt ? ` (ended ${formatDiscountEndsAt(course.pricing.freeEndsAt)})` : ''}. Students currently pay{' '}
                    {formatUsd(pricingPreview.listPrice)}.
                  </div>
                  <div className="fs-5 fw-bold">{formatUsd(pricingPreview.listPrice)}</div>
                </div>
              ) : pricingPreview.hasCompareAt ? (
                <div>
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className="text-muted text-decoration-line-through">{formatUsd(pricingPreview.listPrice)}</span>
                    <span className="fs-5 fw-bold text-success">FREE</span>
                    <span className="badge bg-success-subtle text-success border border-success-subtle">
                      Save {formatUsd(pricingPreview.savings)} (100% off)
                    </span>
                  </div>
                  {pricingPreview.expiration && (
                    <div className="mt-2">
                      <span className={`badge ${pricingPreview.expiration.isEndingSoon ? 'text-bg-warning' : 'text-bg-secondary'}`}>
                        Free offer ends {pricingPreview.expiration.endsAtLabel}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="fs-5 fw-bold text-success">FREE</div>
              )
            ) : pricingPreview.discountExpired ? (
              <div>
                <div className="alert alert-warning py-2 mb-2">
                  This discount has expired
                  {course?.pricing?.discount?.endsAt ? ` (ended ${formatDiscountEndsAt(course.pricing.discount.endsAt)})` : ''}. Students currently
                  see {formatUsd(pricingPreview.listPrice)}.
                </div>
                <div className="fs-5 fw-bold">{formatUsd(pricingPreview.listPrice)}</div>
              </div>
            ) : pricingPreview.hasDiscount ? (
              <div>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <span className="text-muted text-decoration-line-through">{formatUsd(pricingPreview.listPrice)}</span>
                  <span className="fs-5 fw-bold text-success">{formatUsd(pricingPreview.salePrice)}</span>
                  <span className="badge bg-success-subtle text-success border border-success-subtle">
                    Save {formatUsd(pricingPreview.savings)} ({pricingPreview.label})
                  </span>
                </div>
                {pricingPreview.expiration && (
                  <div className="mt-2">
                    <span className={`badge ${pricingPreview.expiration.isEndingSoon ? 'text-bg-warning' : 'text-bg-secondary'}`}>
                      Offer ends {pricingPreview.expiration.endsAtLabel}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="fs-5 fw-bold">{formatUsd(Number(form.price || 0))}</div>
            )}
            <Form.Text muted className="d-block mt-2">
              {form.isFree
                ? pricingPreview.freeOfferExpired
                  ? 'Enroll button will switch to paid checkout after the free offer ends.'
                  : 'Enroll button will read “Enroll for Free” — no payment checkout.'
                : 'Students are charged the sale price at checkout.'}
            </Form.Text>
          </div>
        </Card.Body>
      </Card>

      <Button type="submit" disabled={loading || disabled || (isEditing && !hasChanges)}>
        {loading ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            Saving…
          </>
        ) : course ? (
          'Update Course'
        ) : (
          'Create Course'
        )}
      </Button>
    </form>
  )
}

export default CourseForm
