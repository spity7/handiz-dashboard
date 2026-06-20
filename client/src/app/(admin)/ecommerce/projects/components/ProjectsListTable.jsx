import { Link } from 'react-router-dom'
import ReactTable from '@/components/Table'
import ProjectsListTableSkeleton from '@/components/skeletons/ProjectsListTableSkeleton'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import Swal from 'sweetalert2'

const ProjectsListTable = ({ projects, isLoading = false, onRefresh }) => {
  const { deleteProject } = useGlobalContext()

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the project!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
    })

    if (result.isConfirmed) {
      try {
        await deleteProject(id)
        Swal.fire('Deleted!', 'Project has been deleted.', 'success')
        if (onRefresh) await onRefresh()
        else window.location.reload()
      } catch (error) {
        Swal.fire('Error', error?.response?.data?.message || 'Delete failed', 'error')
      }
    }
  }

  if (isLoading) {
    return <ProjectsListTableSkeleton variant="vertex" />
  }

  const columns = [
    {
      header: 'Project Name',
      cell: ({
        row: {
          original: { _id, thumbnailUrl, name, category },
        },
      }) => (
        <div className="d-flex align-items-center">
          <div className="flex-shrink-0 me-3">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt={name} className="img-fluid avatar-sm" style={{ width: 50, height: 50, objectFit: 'contain' }} />
            ) : (
              <div className="bg-light d-flex align-items-center justify-content-center rounded" style={{ width: 50, height: 50 }}>
                <IconifyIcon icon="bx:image" className="text-muted fs-4" />
              </div>
            )}
          </div>
          <div className="flex-grow-1">
            <h5 className="mt-0 mb-1">{name}</h5>
            <span
              className="fs-13 text-muted"
              dangerouslySetInnerHTML={{
                __html: category,
              }}
            />
          </div>
        </div>
      ),
    },
    {
      header: 'Action',
      cell: ({
        row: {
          original: { _id },
        },
      }) => (
        <div className="d-flex gap-2">
          <Link to={`/ecommerce/projects/edit/${_id}`} className="btn btn-sm btn-soft-secondary" title="Edit Project">
            <IconifyIcon icon="bx:edit" className="fs-18" />
          </Link>
          <button type="button" className="btn btn-sm btn-soft-danger" title="Delete Project" onClick={() => handleDelete(_id)}>
            <IconifyIcon icon="bx:trash" className="fs-18" />
          </button>
        </div>
      ),
    },
  ]

  const pageSizeList = [5, 10, 20, 50]

  const emptyState =
    projects.length === 0 ? (
      <div className="projects-list-empty projects-list-empty--in-table">
        <div className="projects-list-empty__icon projects-list-empty__icon--empty">
          <IconifyIcon icon="bx:folder-open" className="fs-32" />
        </div>
        <h5 className="projects-list-empty__title">No projects yet</h5>
        <p className="projects-list-empty__description">Create your first Vertex project to get started.</p>
        <div className="projects-list-empty__actions">
          <Link to="/ecommerce/projects/create" className="btn btn-primary">
            <IconifyIcon icon="bx:plus" className="me-1" />
            Create project
          </Link>
        </div>
      </div>
    ) : null

  return (
    <ReactTable
      columns={columns}
      data={projects}
      rowsPerPageList={pageSizeList}
      pageSize={10}
      tableClass="text-nowrap mb-0"
      theadClass="bg-light bg-opacity-50"
      showPagination
      emptyState={emptyState}
    />
  )
}
export default ProjectsListTable
