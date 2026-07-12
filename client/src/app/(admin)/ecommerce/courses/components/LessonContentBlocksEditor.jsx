import { Button, Form } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { THUMBNAIL_ACCEPT_STRING, isImageFile } from '@/utils/imageFile'

const BLOCK_TYPES = [
  { value: 'title', label: 'Title' },
  { value: 'description', label: 'Description' },
  { value: 'quote', label: 'Quote' },
  { value: 'code', label: 'Code' },
  { value: 'image', label: 'Image' },
]

const createBlockId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const mapContentBlocksFromApi = (contentBlocks = []) =>
  contentBlocks.map((block) => ({
    id: createBlockId(),
    type: block.type || 'description',
    content: block.content || '',
  }))

const LessonContentBlocksEditor = ({ blocks, onChange }) => {
  const updateBlock = (index, patch) => {
    const next = blocks.map((block, i) => (i === index ? { ...block, ...patch } : block))
    onChange(next)
  }

  const addBlock = (type = 'description') => {
    onChange([...blocks, { id: createBlockId(), type, content: '' }])
  }

  const removeBlock = (index) => {
    onChange(blocks.filter((_, i) => i !== index))
  }

  const moveBlock = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= blocks.length) return
    const next = [...blocks]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onChange(next)
  }

  const imagePreviewSrc = (content) => {
    if (content instanceof File) return URL.createObjectURL(content)
    if (typeof content === 'string' && content.trim()) return content
    return null
  }

  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <Form.Label className="mb-0">Content Blocks</Form.Label>
        <Button size="sm" variant="outline-primary" onClick={() => addBlock()}>
          <IconifyIcon icon="bx:plus" className="me-1" />
          Add Block
        </Button>
      </div>

      {blocks.length === 0 ? (
        <p className="text-muted small mb-0">No content blocks yet. Add blocks for text or download lessons.</p>
      ) : (
        blocks.map((block, index) => {
          const preview = block.type === 'image' ? imagePreviewSrc(block.content) : null

          return (
            <div key={block.id} className="border rounded p-2 mb-2">
              <div className="d-flex gap-2 mb-2">
                <Form.Select
                  size="sm"
                  value={block.type}
                  onChange={(e) => updateBlock(index, { type: e.target.value, content: '' })}
                  style={{ maxWidth: 180 }}>
                  {BLOCK_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Form.Select>
                <Button size="sm" variant="outline-secondary" onClick={() => moveBlock(index, -1)} disabled={index === 0}>
                  ↑
                </Button>
                <Button size="sm" variant="outline-secondary" onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1}>
                  ↓
                </Button>
                <Button size="sm" variant="outline-danger" className="ms-auto" onClick={() => removeBlock(index)}>
                  <IconifyIcon icon="bx:trash" />
                </Button>
              </div>

              {block.type === 'code' ? (
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={typeof block.content === 'string' ? block.content : ''}
                  onChange={(e) => updateBlock(index, { content: e.target.value })}
                  placeholder="Code snippet"
                />
              ) : block.type === 'image' ? (
                <>
                  <Form.Control
                    type="file"
                    accept={THUMBNAIL_ACCEPT_STRING}
                    className="mb-2"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (!isImageFile(file)) {
                        e.target.value = ''
                        return
                      }
                      updateBlock(index, { content: file })
                    }}
                  />
                  <Form.Control
                    size="sm"
                    value={typeof block.content === 'string' ? block.content : ''}
                    onChange={(e) => updateBlock(index, { content: e.target.value })}
                    placeholder="Or paste image URL"
                    className="mb-2"
                  />
                  {preview && <img src={preview} alt="" className="img-fluid rounded border" style={{ maxHeight: 180 }} />}
                </>
              ) : (
                <Form.Control
                  as={block.type === 'description' || block.type === 'quote' ? 'textarea' : 'input'}
                  rows={block.type === 'description' || block.type === 'quote' ? 3 : undefined}
                  value={typeof block.content === 'string' ? block.content : ''}
                  onChange={(e) => updateBlock(index, { content: e.target.value })}
                  placeholder={block.type === 'title' ? 'Section title' : 'Content'}
                />
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

export default LessonContentBlocksEditor
