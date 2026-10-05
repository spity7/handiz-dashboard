import { Col, Form, Row } from 'react-bootstrap'
import ThumbnailDropzoneInput from '@/components/form/ThumbnailDropzoneInput'
import { HOMEPAGE_AD_STATUS_OPTIONS, homepageAdStatusPreviewClass } from '@/constants/homepageAdStatus'

function toDatetimeLocalValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function HomepageAdFormFields({ values, onChange, thumbnailFile, onThumbnailChange, thumbnailPreviewUrl, resetDropzones, isEdit }) {
  const set = (field) => (e) => {
    const target = e.target
    const value = target.type === 'checkbox' ? target.checked : target.value
    onChange({ ...values, [field]: value })
  }

  return (
    <Row className="g-3">
      <Col lg={6}>
        <Form.Group className="mb-3">
          <Form.Label>Title</Form.Label>
          <Form.Control value={values.title} onChange={set('title')} placeholder="Headline shown on the homepage" required />
        </Form.Group>
      </Col>
      <Col lg={3}>
        <Form.Group className="mb-3">
          <Form.Label>Order</Form.Label>
          <Form.Control type="number" value={values.order} onChange={set('order')} />
        </Form.Group>
      </Col>
      <Col lg={3} className="d-flex align-items-end">
        <Form.Group className="mb-3">
          <Form.Check type="switch" id="homepage-ad-published" label="Published" checked={values.isPublished} onChange={set('isPublished')} />
        </Form.Group>
      </Col>

      <Col lg={4}>
        <Form.Group className="mb-3">
          <Form.Label>Status</Form.Label>
          <Form.Select value={values.status} onChange={set('status')} required>
            {HOMEPAGE_AD_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Form.Select>
          <Form.Text className="text-muted">&quot;Coming Soon&quot; shows on the homepage but the card is not clickable.</Form.Text>
        </Form.Group>
      </Col>
      <Col lg={8}>
        <Form.Group className="mb-3">
          <Form.Label>Meta secondary (optional)</Form.Label>
          <Form.Control value={values.metaSecondary} onChange={set('metaSecondary')} placeholder="Partner or brand name" />
        </Form.Group>
      </Col>

      <Col lg={12}>
        <Form.Group className="mb-3">
          <Form.Label>External URL</Form.Label>
          <Form.Control type="url" value={values.externalUrl} onChange={set('externalUrl')} placeholder="https://example.com/landing" required />
          <Form.Text className="text-muted">Opens in a new browser tab on the storefront.</Form.Text>
        </Form.Group>
      </Col>

      <Col md={6}>
        <Form.Group className="mb-3">
          <Form.Label>Start (optional)</Form.Label>
          <Form.Control type="datetime-local" value={values.startsAtLocal} onChange={set('startsAtLocal')} />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group className="mb-3">
          <Form.Label>End (optional)</Form.Label>
          <Form.Control type="datetime-local" value={values.endsAtLocal} onChange={set('endsAtLocal')} />
        </Form.Group>
      </Col>

      <Col lg={12}>
        {isEdit && thumbnailPreviewUrl && !thumbnailFile ? (
          <div className="mb-3">
            <Form.Label>Current thumbnail</Form.Label>
            <img src={thumbnailPreviewUrl} alt="" width={123} height={92} className="rounded border" style={{ objectFit: 'cover' }} />
          </div>
        ) : null}
        <ThumbnailDropzoneInput
          label={isEdit ? 'Replace thumbnail (optional)' : 'Thumbnail'}
          showPreview
          text="Upload ad image"
          resetTrigger={resetDropzones}
          onFileUpload={(files) => {
            onThumbnailChange(files?.[0] ?? null)
          }}
        />
        {thumbnailFile ? <p className="small text-muted mt-2 mb-0">Selected: {thumbnailFile.name}</p> : null}
      </Col>

      {(thumbnailPreviewUrl || values.title) && (
        <Col lg={12}>
          <p className="fw-semibold mb-2">Preview</p>
          <div className="d-flex align-items-center gap-3 p-3 border rounded bg-light-subtle" style={{ maxWidth: 420 }}>
            {thumbnailPreviewUrl ? (
              <img src={thumbnailPreviewUrl} alt="" width={62} height={46} className="rounded" style={{ objectFit: 'cover' }} />
            ) : null}
            <div>
              <div className="text-uppercase small">
                <span className={homepageAdStatusPreviewClass(values.status)}>
                  {HOMEPAGE_AD_STATUS_OPTIONS.find((o) => o.value === values.status)?.label ?? values.status}
                </span>
                {values.metaSecondary ? <span className="text-muted"> / {values.metaSecondary}</span> : null}
              </div>
              <div className="fw-semibold">{values.title || 'Title'}</div>
            </div>
          </div>
        </Col>
      )}
    </Row>
  )
}

export function emptyHomepageAdFormValues() {
  return {
    title: '',
    status: 'available',
    metaSecondary: '',
    externalUrl: '',
    order: 999,
    isPublished: false,
    startsAtLocal: '',
    endsAtLocal: '',
  }
}

export function homepageAdToFormValues(ad) {
  return {
    title: ad.title ?? '',
    status: ad.status ?? 'available',
    metaSecondary: ad.metaSecondary ?? '',
    externalUrl: ad.externalUrl ?? '',
    order: ad.order ?? 999,
    isPublished: Boolean(ad.isPublished),
    startsAtLocal: toDatetimeLocalValue(ad.startsAt),
    endsAtLocal: toDatetimeLocalValue(ad.endsAt),
  }
}

export function appendHomepageAdFormData(formData, values) {
  formData.append('title', values.title)
  formData.append('status', values.status)
  formData.append('metaSecondary', values.metaSecondary || '')
  formData.append('externalUrl', values.externalUrl)
  formData.append('order', String(values.order))
  formData.append('isPublished', values.isPublished ? 'true' : 'false')
  if (values.startsAtLocal) {
    formData.append('startsAt', new Date(values.startsAtLocal).toISOString())
  } else {
    formData.append('startsAt', '')
  }
  if (values.endsAtLocal) {
    formData.append('endsAt', new Date(values.endsAtLocal).toISOString())
  } else {
    formData.append('endsAt', '')
  }
}
