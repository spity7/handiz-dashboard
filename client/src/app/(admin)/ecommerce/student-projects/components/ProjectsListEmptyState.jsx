import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { Badge, Button } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { ROLES } from '@/constants/roles'

const VISIBILITY_LABELS = {
  active: 'Active',
  deleted: 'Deleted',
  all: 'All',
}

const ProjectsListEmptyState = ({
  variant = 'empty',
  inTable = false,
  userRole,
  profileComplete = true,
  ownerFilter,
  statusFilter,
  visibilityFilter = 'all',
  ownerOptions = [],
  onClearFilters,
}) => {
  const isFiltered = variant === 'filtered'
  const selectedOwner = ownerOptions.find((account) => account._id === ownerFilter)
  const hasActiveFilters = Boolean(ownerFilter || statusFilter || (visibilityFilter && visibilityFilter !== 'all'))

  const emptyCopy =
    userRole === ROLES.USER
      ? {
          title: 'No student projects yet',
          description: 'Create your first project to submit it for review. Once approved, it will appear on handiz.org.',
          actionLabel: 'Create your first project',
        }
      : {
          title: 'No student projects yet',
          description: 'Projects you or your team create will show up here. Get started by adding the first one.',
          actionLabel: 'Create student project',
        }

  return (
    <div className={clsx('projects-list-empty', isFiltered && 'projects-list-empty--filtered', inTable && 'projects-list-empty--in-table')}>
      <div className={clsx('projects-list-empty__icon', isFiltered ? 'projects-list-empty__icon--filtered' : 'projects-list-empty__icon--empty')}>
        <IconifyIcon icon={isFiltered ? 'bx:filter-alt' : 'bx:folder-open'} className="fs-32" />
      </div>

      {isFiltered ? (
        <>
          <h5 className="projects-list-empty__title">No matching projects</h5>
          <p className="projects-list-empty__description">
            Nothing matches your current filters. Try adjusting them or clear everything to see all projects again.
          </p>

          {hasActiveFilters && (
            <div className="projects-list-empty__filters">
              {ownerFilter && (
                <Badge bg="soft-primary" className="projects-list-empty__filter-badge">
                  Owner: {selectedOwner?.username || 'Unknown'}
                </Badge>
              )}
              {statusFilter && (
                <Badge bg="soft-secondary" className="projects-list-empty__filter-badge">
                  Status: {statusFilter}
                </Badge>
              )}
              {visibilityFilter && visibilityFilter !== 'all' && (
                <Badge bg="soft-danger" className="projects-list-empty__filter-badge">
                  Visibility: {VISIBILITY_LABELS[visibilityFilter] || visibilityFilter}
                </Badge>
              )}
            </div>
          )}

          <div className="projects-list-empty__actions">
            <Button variant="primary" onClick={onClearFilters}>
              <IconifyIcon icon="bx:reset" className="me-1" />
              Clear filters
            </Button>
          </div>
        </>
      ) : (
        <>
          <h5 className="projects-list-empty__title">{emptyCopy.title}</h5>
          <p className="projects-list-empty__description">{emptyCopy.description}</p>

          <div className="projects-list-empty__actions">
            <Link
              to={
                profileComplete
                  ? '/ecommerce/student-projects/create'
                  : { pathname: '/pages/account', state: { from: '/ecommerce/student-projects/create' } }
              }
              className="btn btn-primary">
              <IconifyIcon icon="bx:plus" className="me-1" />
              {emptyCopy.actionLabel}
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

export default ProjectsListEmptyState
