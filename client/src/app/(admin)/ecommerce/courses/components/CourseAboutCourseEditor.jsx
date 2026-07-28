import { Button, Card, Col, Form, Row } from 'react-bootstrap'
import { MAX_ABOUT_COURSE_SECTIONS, MAX_ITEMS_PER_SECTION, emptyAboutCourseSection } from '../utils/courseAboutSections'

export default function CourseAboutCourseEditor({ sections, onChange }) {
  const updateSection = (index, patch) => {
    onChange(sections.map((section, i) => (i === index ? { ...section, ...patch } : section)))
  }

  const updateItem = (sectionIndex, itemIndex, value) => {
    const section = sections[sectionIndex]
    const items = [...(section.items || [])]
    items[itemIndex] = value
    updateSection(sectionIndex, { items })
  }

  const addItem = (sectionIndex) => {
    const section = sections[sectionIndex]
    const items = [...(section.items || [])]
    if (items.length >= MAX_ITEMS_PER_SECTION) return
    items.push('')
    updateSection(sectionIndex, { items })
  }

  const removeItem = (sectionIndex, itemIndex) => {
    const section = sections[sectionIndex]
    const items = (section.items || []).filter((_, i) => i !== itemIndex)
    updateSection(sectionIndex, { items: items.length ? items : [''] })
  }

  const addSection = () => {
    if (sections.length >= MAX_ABOUT_COURSE_SECTIONS) return
    onChange([...sections, emptyAboutCourseSection()])
  }

  const removeSection = (index) => {
    if (sections.length <= 1) {
      onChange([emptyAboutCourseSection()])
      return
    }
    onChange(sections.filter((_, i) => i !== index))
  }

  const moveSection = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= sections.length) return
    const next = [...sections]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    onChange(next)
  }

  return (
    <Card className="mb-4 border">
      <Card.Header className="bg-light fw-semibold d-flex justify-content-between align-items-center">
        <span>About the course (detail page)</span>
        <Button type="button" variant="outline-primary" size="sm" onClick={addSection} disabled={sections.length >= MAX_ABOUT_COURSE_SECTIONS}>
          Add section
        </Button>
      </Card.Header>
      <Card.Body>
        <p className="text-muted mb-4">
          Collapsible sections below &quot;Inside the Course&quot; on the public course page. Each section has a title and bullet items shown when
          expanded (up to {MAX_ABOUT_COURSE_SECTIONS} sections, {MAX_ITEMS_PER_SECTION} items each).
        </p>

        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className={sectionIndex < sections.length - 1 ? 'mb-4 pb-4 border-bottom' : ''}>
            <Row className="align-items-center mb-3 g-2">
              <Col>
                <h6 className="fw-semibold mb-0">Section {sectionIndex + 1}</h6>
              </Col>
              <Col xs="auto" className="d-flex gap-1">
                <Button
                  type="button"
                  variant="light"
                  size="sm"
                  onClick={() => moveSection(sectionIndex, -1)}
                  disabled={sectionIndex === 0}
                  aria-label="Move section up">
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="light"
                  size="sm"
                  onClick={() => moveSection(sectionIndex, 1)}
                  disabled={sectionIndex === sections.length - 1}
                  aria-label="Move section down">
                  ↓
                </Button>
                <Button type="button" variant="outline-danger" size="sm" onClick={() => removeSection(sectionIndex)}>
                  Remove
                </Button>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Section title</Form.Label>
              <Form.Control
                value={section.title}
                onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
                placeholder="e.g. What you will learn"
              />
            </Form.Group>

            <Form.Label>List items</Form.Label>
            {(section.items || []).map((item, itemIndex) => (
              <Row key={itemIndex} className="g-2 mb-2 align-items-center">
                <Col>
                  <Form.Control value={item} onChange={(e) => updateItem(sectionIndex, itemIndex, e.target.value)} placeholder="Bullet point" />
                </Col>
                <Col xs="auto">
                  <Button
                    type="button"
                    variant="light"
                    size="sm"
                    onClick={() => removeItem(sectionIndex, itemIndex)}
                    disabled={(section.items || []).length <= 1}>
                    Remove
                  </Button>
                </Col>
              </Row>
            ))}
            <Button
              type="button"
              variant="link"
              className="px-0"
              onClick={() => addItem(sectionIndex)}
              disabled={(section.items || []).length >= MAX_ITEMS_PER_SECTION}>
              Add item
            </Button>
          </div>
        ))}
      </Card.Body>
    </Card>
  )
}
