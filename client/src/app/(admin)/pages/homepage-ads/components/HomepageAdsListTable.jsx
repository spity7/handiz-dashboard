import clsx from 'clsx'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from 'react-bootstrap'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import { useLmsAsyncBusy } from '@/context/LmsAsyncBusyContext'
import Swal from 'sweetalert2'
import { HOMEPAGE_AD_STATUS_LABELS, homepageAdStatusBadgeVariant } from '@/constants/homepageAdStatus'

function formatSchedule(startsAt, endsAt) {
  if (!startsAt && !endsAt) return 'Always'
  const fmt = (d) => new Date(d).toLocaleString()
  if (startsAt && endsAt) return `${fmt(startsAt)} – ${fmt(endsAt)}`
  if (startsAt) return `From ${fmt(startsAt)}`
  return `Until ${fmt(endsAt)}`
}

const HomepageAdsListTable = ({ homepageAds, onRefresh, actionsLocked = false }) => {
  const { deleteHomepageAd } = useGlobalContext()
  const [deletingId, setDeletingId] = useState(null)

  const tableLocked = actionsLocked || deletingId !== null
  useLmsAsyncBusy(deletingId !== null)

  const handleDelete = async (id) => {
    if (tableLocked) return

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete this homepage ad.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
    })

    if (!result.isConfirmed) return

    setDeletingId(id)
    try {
      await deleteHomepageAd(id)
      Swal.fire('Deleted!', 'Homepage ad has been deleted.', 'success')
      await onRefresh?.()
    } catch (error) {
      Swal.fire('Error', error?.response?.data?.message || 'Delete failed', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const columns = [
    {
      header: 'Ad',
      cell: ({
        row: {
          original: { thumbnailUrl, title, metaSecondary },
        },
      }) => (
        <div className="d-flex align-items-center">
          <div className="flex-shrink-0 me-3">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt={title} className="img-fluid rounded" style={{ width: 62, height: 46, objectFit: 'cover' }} />
            ) : (
              <div className="bg-light d-flex align-items-center justify-content-center rounded" style={{ width: 62, height: 46 }}>
                <IconifyIcon icon="bx:image" className="text-muted fs-4" />
              </div>
            )}
          </div>
          <div className="flex-grow-1">
            <h6 className="mt-0 mb-1">{title}</h6>
            {metaSecondary ? <p className="text-muted small mb-0">{metaSecondary}</p> : null}
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: ({
        row: {
          original: { status },
        },
      }) => {
        const key = status || 'available'
        return (
          <Badge bg={homepageAdStatusBadgeVariant(key)} className="text-uppercase">
            {HOMEPAGE_AD_STATUS_LABELS[key] || key}
          </Badge>
        )
      },
    },
    {
      header: 'URL',
      cell: ({
        row: {
          original: { externalUrl },
        },
      }) => (
        <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="text-truncate d-inline-block" style={{ maxWidth: 200 }}>
          {externalUrl}
        </a>
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
      header: 'Published',
      cell: ({
        row: {
          original: { isPublished },
        },
      }) => <Badge bg={isPublished ? 'success' : 'secondary'}>{isPublished ? 'Published' : 'Draft'}</Badge>,
    },
    {
      header: 'Schedule',
      cell: ({
        row: {
          original: { startsAt, endsAt },
        },
      }) => <span className="small text-muted">{formatSchedule(startsAt, endsAt)}</span>,
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
              to={`/pages/homepage-ads/edit/${_id}`}
              className={clsx('btn btn-sm btn-soft-secondary', tableLocked && 'disabled pe-none')}
              title="Edit"
              aria-disabled={tableLocked}
              tabIndex={tableLocked ? -1 : undefined}>
              <IconifyIcon icon="bx:edit" className="fs-18" />
            </Link>
            <button
              type="button"
              className="btn btn-sm btn-soft-danger"
              title="Delete"
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
      data={homepageAds}
      rowsPerPageList={pageSizeList}
      pageSize={10}
      tableClass="text-nowrap mb-0"
      theadClass="bg-light bg-opacity-50"
    />
  )
}

export default HomepageAdsListTable
