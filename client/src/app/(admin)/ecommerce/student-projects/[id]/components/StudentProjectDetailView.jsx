import { Badge } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import UserContactButtons from '@/components/users/UserContactButtons'
import { ROLES, statusBadgeVariant } from '@/constants/roles'
import { buildStudentProjectWhatsAppMessage } from '@/utils/studentProjectContact'
import StudentProjectGallery from './StudentProjectGallery'
import StudentProjectImageDownload from './StudentProjectImageDownload'

const joinValues = (values) => (Array.isArray(values) && values.length ? values.join(', ') : '—')

const MetaRow = ({ icon, label, children }) => (
  <li className="student-project-detail__meta-row">
    <IconifyIcon icon={icon} className="student-project-detail__meta-icon" />
    <span className="student-project-detail__meta-label">{label}</span>
    <span className="student-project-detail__meta-value">{children}</span>
  </li>
)

const ResourceLink = ({ href, icon, label, variant }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={`student-project-resources__btn student-project-resources__btn--${variant}`}>
    <IconifyIcon icon={icon} aria-hidden />
    {label}
  </a>
)

const ContentBlocks = ({ blocks = [], projectId }) => {
  if (!blocks.length) return null

  return (
    <div className="student-project-detail__blocks">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'title':
            return (
              <h5 key={index} className="student-project-detail__block-title">
                {block.content}
              </h5>
            )
          case 'description':
            return (
              <p key={index} className="student-project-detail__block-text">
                {block.content}
              </p>
            )
          case 'quote':
            return (
              <blockquote key={index} className="student-project-detail__block-quote">
                <p>&ldquo;{block.content}&rdquo;</p>
              </blockquote>
            )
          case 'image':
            return (
              <div key={index} className="student-project-detail__block-image student-project-detail__image-wrap">
                <img src={block.content} alt="Project content" />
                <StudentProjectImageDownload projectId={projectId} label={`content_${index + 1}`} ariaLabel={`Download content image ${index + 1}`} />
              </div>
            )
          default:
            return null
        }
      })}
    </div>
  )
}

const StudentProjectDetailView = ({ project, user }) => {
  const showOwner = user?.role === ROLES.ADMIN || user?.role === ROLES.EDITOR
  const owner = project.createdBy
  const ownerDeleted = Boolean(owner?.deletedAt)
  const projectDeleted = Boolean(project.deletedAt)

  return (
    <div className="student-project-detail">
      <div className="student-project-detail__hero student-project-detail__image-wrap">
        {project.thumbnailUrl ? (
          <>
            <img src={project.thumbnailUrl} alt={project.title} className="student-project-detail__thumbnail" />
            <StudentProjectImageDownload projectId={project._id} label="thumbnail" ariaLabel="Download thumbnail" />
          </>
        ) : (
          <div className="student-project-detail__thumbnail student-project-detail__thumbnail--empty">
            <IconifyIcon icon="bx:image" className="text-muted fs-1" />
          </div>
        )}
      </div>

      <div className="student-project-detail__status-row">
        {project.status && !projectDeleted && <Badge bg={statusBadgeVariant(project.status)}>{project.status}</Badge>}
        {projectDeleted && <Badge bg="danger">Deleted</Badge>}
        {typeof project.order === 'number' && (
          <Badge bg="light" text="dark">
            Order {project.order}
          </Badge>
        )}
      </div>

      <h2 className="student-project-detail__title">{project.title}</h2>

      {showOwner && owner && (
        <div className="student-project-detail__owner">
          <div>
            <span className="text-muted">Owner</span>
            <div className="fw-medium">
              {owner.username}
              {ownerDeleted && (
                <Badge bg="danger" className="ms-2">
                  Deleted
                </Badge>
              )}
            </div>
            {owner.email && <div className="text-muted fs-13">{owner.email}</div>}
          </div>
          <UserContactButtons user={owner} whatsappMessage={buildStudentProjectWhatsAppMessage(project)} />
        </div>
      )}

      <ul className="student-project-detail__meta list-unstyled">
        <MetaRow icon="bx:user" label="Student">
          {project.student}
        </MetaRow>
        <MetaRow icon="bx:expand" label="Area">
          {project.area} m<sup>2</sup>
        </MetaRow>
        <MetaRow icon="bx:purchase-tag" label="Category">
          {joinValues(project.category)}
        </MetaRow>
        <MetaRow icon="bx:bulb" label="Concept">
          {joinValues(project.concept)}
        </MetaRow>
        <MetaRow icon="bx:calendar" label="Year">
          {joinValues(project.year)}
        </MetaRow>
        <MetaRow icon="bx:map" label="Location">
          {joinValues(project.location)}
        </MetaRow>
        <MetaRow icon="bx:building" label="Type">
          {joinValues(project.type)}
        </MetaRow>
        <MetaRow icon="bx:book" label="University">
          {joinValues(project.university)}
        </MetaRow>
      </ul>

      {(project.googleMapUrl?.trim() || project.thesisUrl?.trim() || project.fileUrl?.trim()) && (
        <div className="student-project-resources">
          {project.googleMapUrl?.trim() ? <ResourceLink href={project.googleMapUrl.trim()} icon="bx:map" label="Google Map" variant="map" /> : null}
          {project.thesisUrl?.trim() ? <ResourceLink href={project.thesisUrl.trim()} icon="bx:file" label="Thesis" variant="thesis" /> : null}
          {project.fileUrl?.trim() ? <ResourceLink href={project.fileUrl.trim()} icon="bx:download" label="File" variant="file" /> : null}
        </div>
      )}

      {project.description && <div className="student-project-detail__description" dangerouslySetInnerHTML={{ __html: project.description }} />}

      <ContentBlocks blocks={project.contentBlocks} projectId={project._id} />

      <StudentProjectGallery images={project.gallery} projectId={project._id} />

      {project.concept?.length > 0 && (
        <div className="student-project-detail__tags">
          <span className="student-project-detail__tags-label">Concepts</span>
          <div className="d-flex flex-wrap gap-2">
            {project.concept.map((tag) => (
              <Badge key={tag} bg="soft-primary" className="text-primary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentProjectDetailView
