import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Card, CardBody, Col, Row, Button, Spinner, Form } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import { useGlobalContext } from '@/context/useGlobalContext'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import ComponentContainerCard from '@/components/ComponentContainerCard'

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

const EditAiTool = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getAiToolById, updateAiTool, getAiPromptCategories } = useGlobalContext()

  const [aiTool, setAiTool] = useState(null)
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [description, setDescription] = useState('')
  const [order, setOrder] = useState(999)

  const [thumbnail, setThumbnail] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)

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

  useEffect(() => {
    const fetchAiTool = async () => {
      try {
        const data = await getAiToolById(id)
        setAiTool(data)
        setTitle(data.title)
        const cat = data.category
        const cid = cat && typeof cat === 'object' && cat._id != null ? String(cat._id) : cat != null ? String(cat) : ''
        setCategoryId(cid)
        setDescription(data.description ?? '')
        setOrder(data.order ?? 999)

        setPreview(data.thumbnailUrl)
      } catch (error) {
        alert('Failed to load AI Prompt')
      }
    }
    fetchAiTool()
  }, [id, getAiToolById])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setThumbnail(file)
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result)
      reader.readAsDataURL(file)
    } else {
      setThumbnail(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!normalizeQuillValue(description)) {
      alert('Description is required')
      return
    }
    if (!categoryId) {
      alert('Please select a category')
      return
    }

    try {
      setLoading(true)

      const formData = new FormData()
      formData.append('title', title)
      formData.append('category', categoryId)
      formData.append('description', description)
      formData.append('order', order)

      if (thumbnail) formData.append('thumbnail', thumbnail)

      await updateAiTool(id, formData)
      alert('AI Prompt updated successfully!')
      navigate('/ecommerce/aiTools')
    } catch (error) {
      alert(apiErrorMessage(error, 'Update failed'))
    } finally {
      setLoading(false)
    }
  }

  if (!aiTool)
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" /> <p>Loading...</p>
      </div>
    )

  return (
    <>
      <PageMetaData title="Edit AI Prompt" />
      <PageBreadcrumb title="Edit AI Prompt" subName="Handiz" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <form onSubmit={handleSubmit}>
                <Row>
                  <Col lg={3}>
                    <div className="mb-3">
                      <label className="form-label">Title</label>
                      <input type="text" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required />
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
                  <Col lg={6}>
                    <ComponentContainerCard title="Category">
                      <p className="text-muted small mb-2">
                        Manage labels in <Link to="/ecommerce/aiTools/categories">AI Prompt categories</Link>.
                      </p>
                      <Form.Select
                        id="edit-ai-prompt-category-select"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        disabled={categoriesLoading}>
                        <option value="">{categoriesLoading ? 'Loading…' : 'Select category'}</option>
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                            {c.isFallback ? ' (fallback)' : ''}
                          </option>
                        ))}
                      </Form.Select>
                    </ComponentContainerCard>
                  </Col>
                </Row>

                <Row>
                  <Col lg={12}>
                    <div className="mb-5 mt-3">
                      <label className="form-label">Description</label>
                      <ReactQuill
                        theme="snow"
                        value={description || ''}
                        onChange={setDescription}
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
                    </div>
                  </Col>
                </Row>

                <Row>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label className="form-label">Thumbnail</label>
                      <input type="file" className="form-control" onChange={handleFileChange} />
                      {preview && (
                        <div className="mt-3">
                          <p className="fw-bold mb-1">Preview:</p>
                          <img src={preview} alt="Thumbnail" style={{ width: 80, height: 80, objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>
                  </Col>
                </Row>

                <Button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update AI Prompt'}
                </Button>
              </form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default EditAiTool
