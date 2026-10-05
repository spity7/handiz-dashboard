import { Link } from 'react-router-dom'
import { Badge } from 'react-bootstrap'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import Swal from 'sweetalert2'

function formatSchedule(startsAt, endsAt) {
  if (!startsAt && !endsAt) return 'Always'
  const fmt = (d) => new Date(d).toLocaleString()
  if (startsAt && endsAt) return `${fmt(startsAt)} – ${fmt(endsAt)}`
  if (startsAt) return `From ${fmt(startsAt)}`
  return `Until ${fmt(endsAt)}`
}

const HomepageAdsListTable = ({ homepageAds, onRefresh }) => {
  const { deleteHomepageAd } = useGlobalContext()

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete this homepage ad.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
    })

    if (result.isConfirmed) {
      try {
        await deleteHomepageAd(id)
        Swal.fire('Deleted!', 'Homepage ad has been deleted.', 'success')
        onRefresh?.()
      } catch (error) {
        Swal.fire('Error', error?.response?.data?.message || 'Delete failed', 'error')
      }
    }
  }

  const columns = [
    {
      header: 'Ad',
      cell: ({
        row: {
          original: { thumbnailUrl, title, metaPrimary, metaSecondary },
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
            <p className="text-muted small mb-0 text-uppercase">
              {metaPrimary}
              {metaSecondary ? ` / ${metaSecondary}` : ''}
            </p>
          </div>
        </div>
      ),
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
      header: 'Status',
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
      }) => (
        <div className="d-flex gap-2">
          <Link to={`/pages/homepage-ads/edit/${_id}`} className="btn btn-sm btn-soft-secondary" title="Edit">
            <IconifyIcon icon="bx:edit" className="fs-18" />
          </Link>
          <button type="button" className="btn btn-sm btn-soft-danger" title="Delete" onClick={() => handleDelete(_id)}>
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
      data={homepageAds}
      rowsPerPageList={pageSizeList}
      pageSize={10}
      tableClass="text-nowrap mb-0"
      theadClass="bg-light bg-opacity-50"
    />
  )
}

export default HomepageAdsListTable
