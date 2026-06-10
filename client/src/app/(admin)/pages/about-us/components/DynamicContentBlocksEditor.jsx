import { Button } from 'react-bootstrap'

const DynamicContentBlocksEditor = ({ blocks, onAddBlock, onUpdateBlock, onRemoveBlock, onMoveBlock }) => {
  return (
    <>
      <h4 className="mb-3">Dynamic Content Blocks</h4>

      {blocks.map((block, index) => (
        <div key={block.id} className="mb-3 p-3 border rounded">
          <div className="d-flex justify-content-between align-items-center gap-2 mb-3 flex-wrap">
            <div className="d-flex gap-1 align-items-center flex-wrap">
              <Button
                variant="outline-secondary"
                size="sm"
                type="button"
                disabled={index === 0}
                onClick={() => onMoveBlock(index, -1)}
                aria-label="Move block up">
                ↑
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                type="button"
                disabled={index === blocks.length - 1}
                onClick={() => onMoveBlock(index, 1)}
                aria-label="Move block down">
                ↓
              </Button>
              <span className="text-capitalize fw-bold ms-2">{block.type}</span>
            </div>
            <Button variant="danger" size="sm" type="button" onClick={() => onRemoveBlock(block.id)}>
              Remove
            </Button>
          </div>

          {block.type === 'title' && (
            <input
              type="text"
              className="form-control"
              placeholder="Enter title"
              value={block.content}
              onChange={(e) => onUpdateBlock(block.id, e.target.value)}
            />
          )}

          {block.type === 'description' && (
            <textarea
              className="form-control"
              rows={3}
              placeholder="Enter description"
              value={block.content}
              onChange={(e) => onUpdateBlock(block.id, e.target.value)}
            />
          )}

          {block.type === 'quote' && (
            <textarea
              className="form-control fst-italic"
              rows={2}
              placeholder="Enter quote"
              value={block.content}
              onChange={(e) => onUpdateBlock(block.id, e.target.value)}
            />
          )}

          {block.type === 'image' && (
            <div>
              <input
                type="file"
                className="form-control"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    onUpdateBlock(block.id, e.target.files[0])
                  }
                }}
              />
              {block.content && block.content instanceof File && <div className="mt-2 text-muted">Selected: {block.content.name}</div>}
              {block.content && typeof block.content === 'string' && (
                <div className="mt-2">
                  <img src={block.content} alt="Block content" style={{ width: 100, height: 100, objectFit: 'contain' }} />
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="mb-4">
        <label className="form-label d-block">Add New Block</label>
        <div className="d-flex gap-2 flex-wrap">
          <Button variant="outline-primary" type="button" onClick={() => onAddBlock('title')}>
            + Title
          </Button>
          <Button variant="outline-primary" type="button" onClick={() => onAddBlock('description')}>
            + Description
          </Button>
          <Button variant="outline-primary" type="button" onClick={() => onAddBlock('image')}>
            + Image
          </Button>
          <Button variant="outline-primary" type="button" onClick={() => onAddBlock('quote')}>
            + Quote
          </Button>
        </div>
      </div>
    </>
  )
}

export default DynamicContentBlocksEditor
