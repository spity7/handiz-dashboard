import { Card, Col, Form, Row } from 'react-bootstrap'
import { MAX_COURSE_MARKETING_VIDEOS, MIN_COURSE_MARKETING_VIDEOS } from '../utils/courseMarketingVideos'

const slotLabel = (index) => `Video ${index + 1}`

export default function CourseMarketingVideosEditor({ videos, onChange }) {
  const updateUrl = (index, value) => {
    const next = videos.map((slot, i) => (i === index ? { url: value } : slot))
    onChange(next)
  }

  return (
    <Card className="mb-4 border">
      <Card.Header className="bg-light fw-semibold">Course page preview videos</Card.Header>
      <Card.Body>
        <p className="text-muted mb-4">
          Add {MIN_COURSE_MARKETING_VIDEOS} to {MAX_COURSE_MARKETING_VIDEOS} promotional clips for the &quot;Inside the Course&quot; row on the course
          detail page, or leave them all empty to hide that section. Paste YouTube or Vimeo links for in-page playback; other links open in a new tab.
          Thumbnails are generated automatically. Separate from curriculum lessons.
        </p>
        {videos.map((slot, index) => (
          <Row key={index} className={index < videos.length - 1 ? 'mb-3 pb-3 border-bottom' : ''}>
            <Col md={3} className="d-flex align-items-center">
              <h6 className="fw-semibold mb-md-0">{slotLabel(index)}</h6>
            </Col>
            <Col md={9}>
              <Form.Group className="mb-0">
                <Form.Label className="d-md-none">Video URL</Form.Label>
                <Form.Control
                  type="url"
                  value={slot.url}
                  onChange={(e) => updateUrl(index, e.target.value)}
                  placeholder="https://youtube.com/shorts/… or https://vimeo.com/…"
                />
              </Form.Group>
            </Col>
          </Row>
        ))}
      </Card.Body>
    </Card>
  )
}
