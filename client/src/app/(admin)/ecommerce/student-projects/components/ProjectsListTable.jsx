import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Form } from 'react-bootstrap'
import Swal from 'sweetalert2'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import { useAuthContext } from '@/context/useAuthContext'
import useConfirmAction from '@/hooks/useConfirmAction'
import { canWriteProject, canPublishProject, PROJECT_STATUS, ROLES, statusBadgeVariant } from '@/constants/roles'
import ProjectsListEmptyState from './ProjectsListEmptyState'

const FOCUS_DISMISS_MS = 450
const ALL_FILTER = ''

const getOwnerId = (project) => {
  const owner = project?.createdBy
  if (!owner) return ''
  return String(owner._id ?? owner)
}

const TableHeaderFilter = ({ label, value, onChange, children }) => (
  <Form.Select size="sm" value={value} onChange={(e) => onChange(e.target.value)} className="projects-table-filter" aria-label={label}>
    {children}
  </Form.Select>
)

const ProjectsListTable = ({ projects, onRefresh, highlightProjectId, onClearHighlight }) => {
  const { user } = useAuthContext()
  const { deleteProject, publishProject, unpublishProject } = useGlobalContext()
  const confirmAction = useConfirmAction()
  const tablePageSize = 10
  const [activeHighlightId, setActiveHighlightId] = useState(highlightProjectId)
  const [isDismissing, setIsDismissing] = useState(false)
  const [ownerFilter, setOwnerFilter] = useState(ALL_FILTER)
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER)
  const showAdminColumns = user?.role === ROLES.ADMIN || user?.role === ROLES.EDITOR

  const ownerOptions = useMemo(() => {
    const byId = new Map()

    projects.forEach((project) => {
      const owner = project.createdBy
      if (!owner) return
      const id = String(owner._id ?? owner)
      if (!byId.has(id)) {
        byId.set(id, {
          _id: id,
          username: owner.username || 'Unknown',
          email: owner.email || '',
        })
      }
    })

    return Array.from(byId.values()).sort((a, b) => a.username.localeCompare(b.username))
  }, [projects])

  const filteredProjects = useMemo(() => {
    if (!showAdminColumns) return projects

    return projects.filter((project) => {
      const matchesOwner = !ownerFilter || getOwnerId(project) === ownerFilter
      const matchesStatus = !statusFilter || project.status === statusFilter
      return matchesOwner && matchesStatus
    })
  }, [projects, ownerFilter, statusFilter, showAdminColumns])

  useEffect(() => {
    if (highlightProjectId) {
      setActiveHighlightId(highlightProjectId)
      setIsDismissing(false)
    }
  }, [highlightProjectId])

  useEffect(() => {
    if (!activeHighlightId || !showAdminColumns || !projects.length) return
    const exists = projects.some((project) => String(project._id) === String(activeHighlightId))
    if (!exists) return
    const visible = filteredProjects.some((project) => String(project._id) === String(activeHighlightId))
    if (!visible && (ownerFilter || statusFilter)) {
      setOwnerFilter(ALL_FILTER)
      setStatusFilter(ALL_FILTER)
    }
  }, [activeHighlightId, projects, filteredProjects, ownerFilter, statusFilter, showAdminColumns])

  const clearHighlight = useCallback(() => {
    if (!activeHighlightId || isDismissing) return
    onClearHighlight?.()
    setIsDismissing(true)
    window.setTimeout(() => {
      setActiveHighlightId(null)
      setIsDismissing(false)
    }, FOCUS_DISMISS_MS)
  }, [activeHighlightId, isDismissing, onClearHighlight])

  const initialPageIndex = useMemo(() => {
    if (!activeHighlightId || !filteredProjects.length) return 0
    const index = filteredProjects.findIndex((project) => String(project._id) === activeHighlightId)
    if (index < 0) return 0
    return Math.floor(index / tablePageSize)
  }, [activeHighlightId, filteredProjects])

  const refresh = async () => {
    if (onRefresh) await onRefresh()
    else window.location.reload()
  }

  const runProjectAction = async (onSuccess) => {
    await onSuccess()
    clearHighlight()
    await refresh()
  }

  const handleDelete = async (project) => {
    await confirmAction({
      title: 'Delete project?',
      text: 'This will permanently delete the project.',
      confirmLabel: 'Delete',
      variant: 'danger',
      icon: 'warning',
      onConfirm: async () => {
        try {
          await runProjectAction(async () => {
            await deleteProject(project._id)
            await Swal.fire('Deleted', 'Project has been deleted.', 'success')
          })
        } catch (error) {
          Swal.fire('Error', error?.response?.data?.message || 'Delete failed', 'error')
        }
      },
    })
  }

  const handlePublish = async (project) => {
    await confirmAction({
      title: 'Publish project?',
      text: 'This project will appear on handiz.org.',
      confirmLabel: 'Publish',
      variant: 'primary',
      onConfirm: async () => {
        try {
          await runProjectAction(async () => {
            await publishProject(project._id)
            await Swal.fire('Published', 'Project is now live.', 'success')
          })
        } catch (error) {
          Swal.fire('Error', error?.response?.data?.message || 'Publish failed', 'error')
        }
      },
    })
  }

  const handleUnpublish = async (project) => {
    await confirmAction({
      title: 'Unpublish project?',
      text: 'This project will be hidden from handiz.org.',
      confirmLabel: 'Unpublish',
      variant: 'warning',
      icon: 'warning',
      onConfirm: async () => {
        try {
          await runProjectAction(async () => {
            await unpublishProject(project._id)
            await Swal.fire('Unpublished', 'Project is no longer public.', 'success')
          })
        } catch (error) {
          Swal.fire('Error', error?.response?.data?.message || 'Unpublish failed', 'error')
        }
      },
    })
  }

  const ownerColumn = {
    id: 'owner',
    header: () => (
      <TableHeaderFilter label="Owner" value={ownerFilter} onChange={setOwnerFilter}>
        <option value={ALL_FILTER}>All owners</option>
        {ownerOptions.map((account) => (
          <option key={account._id} value={account._id}>
            {account.username}
            {account.email ? ` (${account.email})` : ''}
          </option>
        ))}
      </TableHeaderFilter>
    ),
    cell: ({
      row: {
        original: { createdBy },
      },
    }) => {
      if (!createdBy) {
        return <span className="text-muted fst-italic">Deleted account</span>
      }
      return (
        <div>
          <div className="fw-medium">{createdBy.username}</div>
          {createdBy.email && <div className="fs-13 text-muted">{createdBy.email}</div>}
        </div>
      )
    },
  }

  const statusColumn = {
    id: 'status',
    header: () => (
      <TableHeaderFilter label="Status" value={statusFilter} onChange={setStatusFilter}>
        <option value={ALL_FILTER}>All statuses</option>
        <option value={PROJECT_STATUS.PENDING}>{PROJECT_STATUS.PENDING}</option>
        <option value={PROJECT_STATUS.PUBLISHED}>{PROJECT_STATUS.PUBLISHED}</option>
        <option value={PROJECT_STATUS.UNPUBLISHED}>{PROJECT_STATUS.UNPUBLISHED}</option>
      </TableHeaderFilter>
    ),
    cell: ({
      row: {
        original: { status },
      },
    }) => (status ? <Badge bg={statusBadgeVariant(status)}>{status}</Badge> : <span className="text-muted">—</span>),
  }

  const columns = [
    ...(showAdminColumns ? [ownerColumn] : []),
    {
      id: 'projectTitle',
      header: 'Project Title',
      meta: { className: 'projects-list-col-title' },
      cell: ({
        row: {
          original: { thumbnailUrl, title, type, status },
        },
      }) => (
        <div className="d-flex align-items-center projects-list-col-title__content">
          <div className="flex-shrink-0 me-3">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt={title} className="img-fluid avatar-sm" style={{ width: 50, height: 50, objectFit: 'contain' }} />
            ) : (
              <div className="bg-light d-flex align-items-center justify-content-center rounded" style={{ width: 50, height: 50 }}>
                <IconifyIcon icon="bx:image" className="text-muted fs-4" />
              </div>
            )}
          </div>
          <div className="flex-grow-1 min-w-0">
            <h5 className="mt-0 mb-1 projects-list-col-title__heading">{title}</h5>
            <span className="fs-13 text-muted projects-list-col-title__type" dangerouslySetInnerHTML={{ __html: type }} />
            {!showAdminColumns && status && (
              <Badge bg={statusBadgeVariant(status)} className="ms-2">
                {status}
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    ...(showAdminColumns ? [statusColumn] : []),
    {
      header: 'Order',
      cell: ({
        row: {
          original: { order },
        },
      }) => order,
    },
    {
      header: 'Action',
      cell: ({ row: { original: project } }) => {
        const showWrite = canWriteProject(user, project)
        const showPublish = canPublishProject(user, project)
        const isFocusedProject = activeHighlightId && String(project._id) === String(activeHighlightId)
        return (
          <div className="d-flex gap-2 flex-wrap">
            {showWrite && (
              <Link
                to={`/ecommerce/student-projects/edit/${project._id}`}
                className="btn btn-sm btn-soft-secondary"
                title="Edit Project"
                onClick={() => isFocusedProject && clearHighlight()}>
                <IconifyIcon icon="bx:edit" className="fs-18" />
              </Link>
            )}
            {showPublish && project.status !== PROJECT_STATUS.PUBLISHED && (
              <button type="button" className="btn btn-sm btn-soft-success" title="Publish" onClick={() => handlePublish(project)}>
                <IconifyIcon icon="bx:upload" className="fs-18" />
              </button>
            )}
            {showPublish && project.status === PROJECT_STATUS.PUBLISHED && (
              <button type="button" className="btn btn-sm btn-soft-warning" title="Unpublish" onClick={() => handleUnpublish(project)}>
                <IconifyIcon icon="bx:hide" className="fs-18" />
              </button>
            )}
            {showWrite && (
              <button type="button" className="btn btn-sm btn-soft-danger" title="Delete Project" onClick={() => handleDelete(project)}>
                <IconifyIcon icon="bx:trash" className="fs-18" />
              </button>
            )}
          </div>
        )
      },
    },
  ]

  const pageSizeList = [5, 10, 20, 50]

  const isFilteredEmpty = filteredProjects.length === 0 && projects.length > 0
  const isFullyEmpty = projects.length === 0

  const emptyState =
    isFilteredEmpty || isFullyEmpty ? (
      <ProjectsListEmptyState
        variant={isFilteredEmpty ? 'filtered' : 'empty'}
        inTable
        userRole={user?.role}
        ownerFilter={ownerFilter}
        statusFilter={statusFilter}
        ownerOptions={ownerOptions}
        onClearFilters={() => {
          setOwnerFilter(ALL_FILTER)
          setStatusFilter(ALL_FILTER)
        }}
      />
    ) : null

  return (
    <ReactTable
      key={`${ownerFilter}-${statusFilter}-${filteredProjects.length}-${activeHighlightId || 'none'}`}
      columns={columns}
      data={filteredProjects}
      rowsPerPageList={pageSizeList}
      pageSize={tablePageSize}
      initialPageIndex={initialPageIndex}
      getRowDomId={(project) => project._id}
      rowDomIdPrefix="project-row-"
      highlightedRowId={activeHighlightId}
      highlightDismissing={isDismissing}
      getRowClassName={(_, { isHighlighted, isDismissing: dismissing }) =>
        clsx(isHighlighted && 'project-row-focus', isHighlighted && dismissing && 'project-row-focus--dismissing')
      }
      tableClass={clsx('text-nowrap mb-0 projects-list-table')}
      theadClass="bg-light bg-opacity-50"
      showPagination
      emptyState={emptyState}
    />
  )
}
export default ProjectsListTable
