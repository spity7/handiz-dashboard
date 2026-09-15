import { Form } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { PUBLISH_REQUIRES_PUBLISHED_LESSON } from '../utils/courseStatusUi'

const CourseStatusSelect = ({
  name = 'status',
  value,
  onChange,
  isEditing,
  hasPublishedLesson,
  publishedAt,
  lastPublishedAt,
  formatPublishedDate,
}) => {
  const publishLocked = isEditing && !hasPublishedLesson
  const showPublishedOption = isEditing && hasPublishedLesson

  return (
    <div className="course-status-field">
      <Form.Select name={name} value={value} onChange={onChange} aria-describedby={publishLocked ? 'course-status-publish-hint' : undefined}>
        <option value="Draft">Draft</option>
        <option value="Coming Soon">Coming Soon</option>
        {showPublishedOption && <option value="Published">Published</option>}
        {publishLocked && value === 'Published' && (
          <option value="Published" disabled>
            Published (requires a published lesson)
          </option>
        )}
        {isEditing && <option value="Archived">Archived</option>}
      </Form.Select>

      {!isEditing && (
        <Form.Text muted className="d-block mt-2">
          Choose Coming Soon to list the course on the public catalog before lessons are ready.
        </Form.Text>
      )}

      {publishLocked && (
        <div id="course-status-publish-hint" className="course-status-publish-hint" role="status" aria-live="polite">
          <div className="course-status-publish-hint__header">
            <span className="course-status-publish-hint__icon" aria-hidden="true">
              <IconifyIcon icon="bx:lock-alt" />
            </span>
            <span className="course-status-publish-hint__title">Published is not available yet</span>
          </div>
          <p className="course-status-publish-hint__text mb-0">{PUBLISH_REQUIRES_PUBLISHED_LESSON}</p>
          <p className="course-status-publish-hint__action mb-0">
            Add or edit a lesson in <strong>Curriculum</strong> and enable <strong>Published</strong> on that lesson.
          </p>
        </div>
      )}

      {isEditing && hasPublishedLesson && value === 'Published' && (
        <Form.Text muted className="d-block mt-2">
          Editing course details or modules does not change status. If all published lessons are removed, the course moves to Draft automatically.
        </Form.Text>
      )}

      {value === 'Coming Soon' && (
        <Form.Text muted className="d-block mt-2">
          Coming soon courses appear on /courses but are not clickable.
        </Form.Text>
      )}

      {isEditing && hasPublishedLesson && value !== 'Published' && (
        <div className="course-status-publish-ready" role="status">
          <IconifyIcon icon="bx:check-circle" className="course-status-publish-ready__icon" aria-hidden="true" />
          <span>You can set status to Published — at least one published lesson is ready.</span>
        </div>
      )}

      {publishedAt && formatPublishedDate && (
        <Form.Text muted className="d-block mt-2">
          First published {formatPublishedDate(publishedAt)}
          {lastPublishedAt && lastPublishedAt !== publishedAt && ` · Last published ${formatPublishedDate(lastPublishedAt)}`}
        </Form.Text>
      )}
    </div>
  )
}

export default CourseStatusSelect
