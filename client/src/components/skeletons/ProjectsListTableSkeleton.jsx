import clsx from 'clsx'
import { Placeholder, Table } from 'react-bootstrap'

const DEFAULT_ROW_COUNT = 8

const ProjectTitleCellSkeleton = () => (
  <div className="d-flex align-items-center">
    <Placeholder as="div" animation="glow" className="projects-list-skeleton__thumb rounded flex-shrink-0 me-3" />
    <div className="flex-grow-1 placeholder-glow">
      <Placeholder xs={7} className="mb-2" />
      <Placeholder xs={4} size="sm" />
    </div>
  </div>
)

const OwnerCellSkeleton = () => (
  <div className="placeholder-glow">
    <Placeholder xs={6} />
    <Placeholder xs={8} size="sm" className="mt-1" />
  </div>
)

const ActionCellSkeleton = () => (
  <div className="d-flex gap-2 placeholder-glow">
    <Placeholder as="span" animation="glow" className="projects-list-skeleton__action rounded" />
    <Placeholder as="span" animation="glow" className="projects-list-skeleton__action rounded" />
  </div>
)

const VARIANT_HEADERS = {
  student: null,
  standard: 'Project Name',
  'media-order': 'Title',
  'media-meta-order': 'Title',
}

const ProjectsListTableSkeleton = ({ variant = 'student', showAdminColumns = false, rowCount = DEFAULT_ROW_COUNT }) => {
  const isStudent = variant === 'student'
  const isMediaOrder = variant === 'media-order'
  const isMediaMetaOrder = variant === 'media-meta-order'
  const titleHeader = VARIANT_HEADERS[variant] ?? 'Project Title'

  return (
    <div className="projects-list-skeleton" aria-busy="true" aria-label="Loading list">
      <Table responsive hover className={clsx('text-nowrap mb-0', isStudent && 'projects-list-table')}>
        <thead className="bg-light bg-opacity-50">
          <tr>
            {showAdminColumns && (
              <th>
                <Placeholder as="span" animation="glow" className="projects-list-skeleton__filter rounded" />
              </th>
            )}
            <th className={isStudent ? 'projects-list-col-title' : undefined}>{titleHeader}</th>
            {isStudent && (
              <>
                <th>
                  <div className="d-flex flex-row flex-wrap gap-2 align-items-center projects-table-filters">
                    <Placeholder as="span" animation="glow" className="projects-list-skeleton__filter rounded" />
                    <Placeholder as="span" animation="glow" className="projects-list-skeleton__filter rounded" />
                  </div>
                </th>
                <th>Order</th>
              </>
            )}
            {isMediaMetaOrder && <th>Category</th>}
            {(isMediaOrder || isMediaMetaOrder) && <th>Order</th>}
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }, (_, index) => (
            <tr key={index}>
              {showAdminColumns && (
                <td>
                  <OwnerCellSkeleton />
                </td>
              )}
              <td className={isStudent ? 'projects-list-col-title' : undefined}>
                <ProjectTitleCellSkeleton />
              </td>
              {isStudent && (
                <>
                  <td>
                    <Placeholder as="span" animation="glow" className="projects-list-skeleton__badge rounded-pill" />
                  </td>
                  <td>
                    <Placeholder as="span" animation="glow" className="projects-list-skeleton__order" />
                  </td>
                </>
              )}
              {isMediaMetaOrder && (
                <td>
                  <Placeholder as="span" animation="glow" className="projects-list-skeleton__badge rounded-pill" />
                </td>
              )}
              {(isMediaOrder || isMediaMetaOrder) && (
                <td>
                  <Placeholder as="span" animation="glow" className="projects-list-skeleton__order" />
                </td>
              )}
              <td>
                <ActionCellSkeleton />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 pt-3 placeholder-glow">
        <Placeholder as="span" animation="glow" className="projects-list-skeleton__pagination-label rounded" />
        <div className="d-flex gap-1">
          {Array.from({ length: 5 }, (_, index) => (
            <Placeholder key={index} as="span" animation="glow" className="projects-list-skeleton__page-btn rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default ProjectsListTableSkeleton
