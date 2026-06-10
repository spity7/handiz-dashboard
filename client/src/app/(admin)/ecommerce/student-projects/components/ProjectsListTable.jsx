import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { Badge } from 'react-bootstrap'
import Swal from 'sweetalert2'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import { useAuthContext } from '@/context/useAuthContext'
import useConfirmAction from '@/hooks/useConfirmAction'
import { canWriteProject, canPublishProject, PROJECT_STATUS, statusBadgeVariant } from '@/constants/roles'

const ProjectsListTable = ({ projects, onRefresh }) => {
  const { user } = useAuthContext()
  const { deleteProject, publishProject, unpublishProject } = useGlobalContext()
  const confirmAction = useConfirmAction()

  const refresh = () => {
    if (onRefresh) onRefresh()
    else window.location.reload()
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
          await deleteProject(project._id)
          await Swal.fire('Deleted', 'Project has been deleted.', 'success')
          refresh()
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
          await publishProject(project._id)
          await Swal.fire('Published', 'Project is now live.', 'success')
          refresh()
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
          await unpublishProject(project._id)
          await Swal.fire('Unpublished', 'Project is no longer public.', 'success')
          refresh()
        } catch (error) {
          Swal.fire('Error', error?.response?.data?.message || 'Unpublish failed', 'error')
        }
      },
    })
  }

  const columns = [
    {
      header: 'Project Title',
      cell: ({
        row: {
          original: { _id, thumbnailUrl, title, type, status },
        },
      }) => (
        <div className="d-flex align-items-center">
          <div className="flex-shrink-0 me-3">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt={title} className="img-fluid avatar-sm" style={{ width: 50, height: 50, objectFit: 'contain' }} />
            ) : (
              <div className="bg-light d-flex align-items-center justify-content-center rounded" style={{ width: 50, height: 50 }}>
                <IconifyIcon icon="bx:image" className="text-muted fs-4" />
              </div>
            )}
          </div>
          <div className="flex-grow-1">
            <h5 className="mt-0 mb-1">{title}</h5>
            <span className="fs-13 text-muted" dangerouslySetInnerHTML={{ __html: type }} />
            {status && (
              <Badge bg={statusBadgeVariant(status)} className="ms-2">
                {status}
              </Badge>
            )}
          </div>
        </div>
      ),
    },
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
        return (
          <div className="d-flex gap-2 flex-wrap">
            {showWrite && (
              <Link to={`/ecommerce/student-projects/edit/${project._id}`} className="btn btn-sm btn-soft-secondary" title="Edit Project">
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
  return (
    <ReactTable
      columns={columns}
      data={projects}
      rowsPerPageList={pageSizeList}
      pageSize={10}
      tableClass={clsx('text-nowrap mb-0')}
      theadClass="bg-light bg-opacity-50"
      showPagination
    />
  )
}
export default ProjectsListTable
