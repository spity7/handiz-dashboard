import clsx from 'clsx'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import { useLmsAsyncBusy } from '@/context/LmsAsyncBusyContext'
import Swal from 'sweetalert2'

const OfficesListTable = ({ offices, onRefresh, actionsLocked = false }) => {
  const { deleteOffice } = useGlobalContext()
  const [deletingId, setDeletingId] = useState(null)

  const tableLocked = actionsLocked || deletingId !== null
  useLmsAsyncBusy(deletingId !== null)

  const handleDelete = async (id) => {
    if (tableLocked) return

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the office!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
    })

    if (!result.isConfirmed) return

    setDeletingId(id)
    try {
      await deleteOffice(id)
      Swal.fire('Deleted!', 'Office has been deleted.', 'success')
      if (onRefresh) await onRefresh()
    } catch (error) {
      Swal.fire('Error', error?.response?.data?.message || 'Delete failed', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const columns = [
    {
      header: 'Office Title',
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
      }) => {
        const rowDeleting = deletingId === _id
        return (
          <div className="d-flex gap-2">
            <Link
              to={`/ecommerce/offices/edit/${_id}`}
              className={clsx('btn btn-sm btn-soft-secondary', tableLocked && 'disabled pe-none')}
              title="Edit Office"
              aria-disabled={tableLocked}
              tabIndex={tableLocked ? -1 : undefined}>
              <IconifyIcon icon="bx:edit" className="fs-18" />
            </Link>
            <button
              type="button"
              className="btn btn-sm btn-soft-danger"
              title="Delete Office"
              disabled={tableLocked}
              aria-busy={rowDeleting}
              onClick={() => handleDelete(_id)}>
              {rowDeleting ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              ) : (
                <IconifyIcon icon="bx:trash" className="fs-18" />
              )}
            </button>
          </div>
        )
      },
    },
  ]

  const pageSizeList = [5, 10, 20, 50]
  return (
    <ReactTable
      columns={columns}
      data={offices}
      rowsPerPageList={pageSizeList}
      pageSize={10}
      tableClass="text-nowrap mb-0"
      theadClass="bg-light bg-opacity-50"
      showPagination
    />
  )
}
export default OfficesListTable
