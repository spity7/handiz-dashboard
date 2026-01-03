import clsx from 'clsx'
import { Link } from 'react-router-dom'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import Swal from 'sweetalert2'

const CompetitionsListTable = ({ competitions }) => {
  const { deleteCompetition } = useGlobalContext() // ✅ hook inside component

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the competition!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
    })

    if (result.isConfirmed) {
      try {
        await deleteCompetition(id)
        Swal.fire('Deleted!', 'Competition has been deleted.', 'success')
        // Optionally refresh table data from parent component
        window.location.reload()
      } catch (error) {
        Swal.fire('Error', error?.response?.data?.message || 'Delete failed', 'error')
      }
    }
  }

  const columns = [
    {
      header: 'Competition Title',
      cell: ({
        row: {
          original: { _id, thumbnailUrl, title, type },
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
            <span
              className="fs-13 text-muted"
              dangerouslySetInnerHTML={{
                __html: type,
              }}
            />
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
      cell: ({
        row: {
          original: { _id },
        },
      }) => (
        <div className="d-flex gap-2">
          <Link to={`/ecommerce/competitions/edit/${_id}`} className="btn btn-sm btn-soft-secondary" title="Edit Competition">
            <IconifyIcon icon="bx:edit" className="fs-18" />
          </Link>
          <button type="button" className="btn btn-sm btn-soft-danger" title="Delete Competition" onClick={() => handleDelete(_id)}>
            <IconifyIcon icon="bx:trash" className="fs-18" />
          </button>
        </div>
      ),
    },
  ]

  const pageSizeList = [5, 10, 20, 50]
  return (
    <ReactTable
      columns={columns}
      data={competitions}
      rowsPerPageList={pageSizeList}
      pageSize={10}
      tableClass="text-nowrap mb-0"
      theadClass="bg-light bg-opacity-50"
      showPagination
    />
  )
}
export default CompetitionsListTable
