import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardBody, Col, Row, Button } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import ProjectFormSkeleton from '@/components/skeletons/ProjectFormSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import ReactQuill from 'react-quill'
import DropzoneFormInput from '@/components/form/DropzoneFormInput'
import { THUMBNAIL_ACCEPT_STRING, readThumbnailInput } from '@/utils/imageFile'
import SelectFormInput from '@/components/form/SelectFormInput'
import { renameKeys } from '@/utils/rename-object-keys'
import 'react-quill/dist/quill.snow.css'
import useConfirmFormSubmit from '@/hooks/useConfirmFormSubmit'
import { buildFormConfirmOptions } from '@/utils/formConfirm'
import useRegisterUnsavedFormDirty from '@/hooks/useRegisterUnsavedFormDirty'
import { useUnsavedFormChanges } from '@/context/UnsavedFormChangesContext'
import { useLmsAsyncBusy } from '@/context/LmsAsyncBusyContext'

const OFFICE_STATUS_OPTIONS = ['Hiring', 'Not Hiring']

function normalizeOfficeStatus(status) {
  if (!Array.isArray(status) || status.length === 0) return ''
  if (status.includes('Hiring')) return 'Hiring'
  if (status.includes('Not Hiring')) return 'Not Hiring'
  return status[0]
}

const EditOffice = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const confirmFormSubmit = useConfirmFormSubmit()
  const { acknowledgeSuccessfulFormSave } = useUnsavedFormChanges()
  const { getOfficeById, updateOffice } = useGlobalContext()

  const [office, setOffice] = useState(null)
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState([])
  const [locationMap, setLocationMap] = useState('')
  const [email, setEmail] = useState('')
  const [instagram, setInstagram] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [link, setLink] = useState('')
  const [order, setOrder] = useState(999)
  const [teamNb, setTeamNb] = useState(0)
  const [category, setCategory] = useState([])
  const [status, setStatus] = useState('')

  const [thumbnail, setThumbnail] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchOffice = async () => {
      try {
        const data = await getOfficeById(id)
        setOffice(data)
        setTitle(data.title)
        setLocation(data.location || [])
        setLocationMap(data.locationMap)
        setEmail(data.email)
        setInstagram(data.instagram)
        setLinkedin(data.linkedin)
        setLink(data.link || '')

        setOrder(data.order ?? 999)
        setTeamNb(data.teamNb ?? 0)
        setCategory(data.category || [])
        setStatus(normalizeOfficeStatus(data.status))
        setPreview(data.thumbnailUrl)
      } catch (error) {
        alert('Failed to load office')
      }
    }
    fetchOffice()
  }, [id, getOfficeById])

  const officeFormSnapshot = office
    ? {
        title: office.title,
        location: office.location || [],
        locationMap: office.locationMap,
        email: office.email,
        instagram: office.instagram,
        linkedin: office.linkedin,
        link: office.link || '',
        order: office.order ?? 999,
        teamNb: office.teamNb ?? 0,
        category: office.category || [],
        status: normalizeOfficeStatus(office.status),
      }
    : null

  const officeFormCurrent = {
    title,
    location,
    locationMap,
    email,
    instagram,
    linkedin,
    link,
    order,
    teamNb,
    category,
    status,
  }

  useRegisterUnsavedFormDirty(officeFormSnapshot, officeFormCurrent, { extraDirty: Boolean(thumbnail) })
  useLmsAsyncBusy(loading)

  const handleFileChange = (e) => {
    readThumbnailInput(e, {
      onValid: (file) => {
        setThumbnail(file)
        const reader = new FileReader()
        reader.onload = () => setPreview(reader.result)
        reader.readAsDataURL(file)
      },
      onClear: () => setThumbnail(null),
      onInvalid: (message) => alert(message),
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (location.length === 0) {
      alert('Please select at least one  Location')
      return
    }
    if (category.length === 0) {
      alert('Please select at least one  Category')
      return
    }
    if (!status) {
      alert('Please select a status')
      return
    }

    await confirmFormSubmit(buildFormConfirmOptions('update', { subject: 'this office' }), async () => {
      try {
        setLoading(true)

        const formData = new FormData()
        formData.append('title', title)
        formData.append('locationMap', locationMap)
        formData.append('email', email)
        formData.append('instagram', instagram)
        formData.append('linkedin', linkedin)
        formData.append('link', link.trim())

        formData.append('order', order)
        formData.append('teamNb', teamNb)

        if (thumbnail) formData.append('thumbnail', thumbnail)

        location.forEach((c) => formData.append('location', c))
        category.forEach((c) => formData.append('category', c))
        formData.append('status', status)

        await updateOffice(id, formData)
        setOffice((prev) =>
          prev
            ? {
                ...prev,
                title,
                location,
                locationMap,
                email,
                instagram,
                linkedin,
                link: link.trim(),
                order,
                teamNb,
                category,
                status: [status],
              }
            : prev,
        )
        setThumbnail(null)
        acknowledgeSuccessfulFormSave()
        alert('Office updated successfully!')
        navigate('/ecommerce/offices')
      } catch (error) {
        alert(error?.response?.data?.message || 'Update failed')
      } finally {
        setLoading(false)
      }
    })
  }

  const toggleCheckbox = (value, state, setState) => {
    setState((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  if (!office) return <ProjectFormSkeleton variant="standard" title="Edit Office" subName="Handiz" />

  return (
    <>
      <PageMetaData title="Edit Office" />
      <PageBreadcrumb title="Edit Office" subName="Handiz" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <form onSubmit={handleSubmit}>
                <fieldset disabled={loading} style={{ border: 'none', margin: 0, padding: 0 }}>
                  <Row>
                    <Col lg={3}>
                      <div className="mb-3">
                        <label className="form-label">Office Title</label>
                        <input type="text" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required />
                      </div>
                    </Col>

                    <Col lg={3}>
                      <label className="form-label fw-bold">Location *</label>
                      {['LB - Beirut', 'LB - North', 'LB - South', 'LB - Mount Leb', 'LB - Bekaa'].map((item) => (
                        <div key={item}>
                          <input type="checkbox" checked={location.includes(item)} onChange={() => toggleCheckbox(item, location, setLocation)} />{' '}
                          {item}
                        </div>
                      ))}
                      {location.length === 0 && <p className="text-danger">Select at least one location</p>}
                    </Col>

                    <Col lg={3}>
                      <div className="mb-3">
                        <label className="form-label">Location Map</label>
                        <input type="text" className="form-control" value={locationMap} onChange={(e) => setLocationMap(e.target.value)} required />
                      </div>
                    </Col>

                    <Col lg={3}>
                      <div className="mb-3">
                        <label className="form-label">Order</label>
                        <input
                          type="number"
                          className="form-control"
                          value={order}
                          onChange={(e) => setOrder(Number(e.target.value))}
                          placeholder="Enter Order"
                          required
                        />
                      </div>
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col lg={3}>
                      <div className="mb-3">
                        <label className="form-label">Instagram</label>
                        <input type="text" className="form-control" value={instagram} onChange={(e) => setInstagram(e.target.value)} required />
                      </div>
                    </Col>
                    <Col lg={3}>
                      <div className="mb-3">
                        <label className="form-label">Linkedin</label>
                        <input type="text" className="form-control" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} required />
                      </div>
                    </Col>

                    <Col lg={3}>
                      <div className="mb-3">
                        <label className="form-label">Website link</label>
                        <input
                          type="url"
                          className="form-control"
                          value={link}
                          onChange={(e) => setLink(e.target.value)}
                          placeholder="https://studio.example.com"
                        />
                      </div>
                    </Col>

                    <Col lg={3}>
                      <div className="mb-3">
                        <label className="form-label">Email</label>
                        <input type="text" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
                      </div>
                    </Col>

                    <Col lg={3}>
                      <div className="mb-3">
                        <label className="form-label">TeamNb</label>
                        <input
                          type="number"
                          className="form-control"
                          value={teamNb}
                          onChange={(e) => setTeamNb(Number(e.target.value))}
                          placeholder="Enter TeamNb"
                          required
                        />
                      </div>
                    </Col>
                  </Row>

                  <Row>
                    <Col lg={6}>
                      <div className="mb-3">
                        <label className="form-label">Office Thumbnail</label>
                        <input type="file" className="form-control" accept={THUMBNAIL_ACCEPT_STRING} onChange={handleFileChange} />
                        {preview && (
                          <div className="mt-3">
                            <p className="fw-bold mb-1">Preview:</p>
                            <img src={preview} alt="Office Thumbnail" style={{ width: 80, height: 80, objectFit: 'contain' }} />
                          </div>
                        )}
                      </div>
                    </Col>

                    <Col lg={3}>
                      <label className="form-label fw-bold">Category *</label>
                      {['Architecture', 'Interior', 'Landscape', 'Urban Planning'].map((item) => (
                        <div key={item}>
                          <input type="checkbox" checked={category.includes(item)} onChange={() => toggleCheckbox(item, category, setCategory)} />{' '}
                          {item}
                        </div>
                      ))}
                      {category.length === 0 && <p className="text-danger">Select at least one category</p>}
                    </Col>

                    <Col lg={3}>
                      <label className="form-label fw-bold">Status *</label>
                      {OFFICE_STATUS_OPTIONS.map((item) => (
                        <div key={item} className="form-check">
                          <input
                            type="radio"
                            className="form-check-input"
                            id={`office-status-${item}`}
                            name="office-status"
                            checked={status === item}
                            onChange={() => setStatus(item)}
                          />
                          <label className="form-check-label" htmlFor={`office-status-${item}`}>
                            {item}
                          </label>
                        </div>
                      ))}
                      {!status && <p className="text-danger">Select a status</p>}
                    </Col>
                  </Row>

                  <Button type="submit" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Office'}
                  </Button>
                </fieldset>
              </form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default EditOffice
