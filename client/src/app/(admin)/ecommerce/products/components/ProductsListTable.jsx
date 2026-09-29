import clsx from 'clsx'
import { useMemo } from 'react'
import { Badge } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'

const ProductsListTable = ({ products, onRefresh, actionsLocked }) => {
  const { deleteShopProduct } = useGlobalContext()

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Archive product "${title}"?`)) return
    try {
      await deleteShopProduct(id)
      onRefresh?.()
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to archive product')
    }
  }

  const columns = useMemo(
    () => [
      {
        header: 'Product',
        cell: ({ row: { original: product } }) => (
          <div className="d-flex align-items-center">
            <div className="flex-shrink-0 me-3">
              <Link to={`/ecommerce/products/${product._id}`}>
                <img src={product.thumbnailUrl} alt={product.title} className="img-fluid avatar-sm rounded" />
              </Link>
            </div>
            <div className="flex-grow-1">
              <h5 className="mt-0 mb-1">
                <Link to={`/ecommerce/products/${product._id}`} className="text-reset">
                  {product.title}
                </Link>
              </h5>
              <span className="fs-13 text-muted">{product.sku || '—'}</span>
            </div>
          </div>
        ),
      },
      {
        header: 'Price',
        cell: ({ row: { original: product } }) => (
          <span>
            ${Number(product.unitPrice ?? product.price).toFixed(2)}
            {product.listPrice && product.unitPrice < product.listPrice && (
              <small className="text-muted ms-1 text-decoration-line-through">${Number(product.listPrice).toFixed(2)}</small>
            )}
          </span>
        ),
      },
      {
        header: 'Stock',
        cell: ({ row: { original: product } }) =>
          product.trackInventory ? (
            <span className={product.stockQuantity <= product.lowStockThreshold ? 'text-warning' : ''}>{product.stockQuantity}</span>
          ) : (
            <span className="text-muted">Not tracked</span>
          ),
      },
      {
        header: 'Status',
        cell: ({ row: { original: product } }) => (
          <Badge bg={product.status === 'Published' ? 'success' : product.status === 'Archived' ? 'secondary' : 'warning'}>{product.status}</Badge>
        ),
      },
      {
        header: 'Featured',
        cell: ({ row: { original: product } }) => (product.featured ? <IconifyIcon icon="bxs:star" className="text-warning" /> : '—'),
      },
      {
        header: 'Action',
        cell: ({ row: { original: product } }) => (
          <div className="d-flex gap-1">
            <Link
              to={`/ecommerce/products/edit/${product._id}`}
              className={clsx('btn btn-sm btn-soft-secondary', actionsLocked && 'disabled pe-none')}>
              <IconifyIcon icon="bx:edit" className="fs-18" />
            </Link>
            <button
              type="button"
              className="btn btn-sm btn-soft-danger"
              disabled={actionsLocked}
              onClick={() => handleDelete(product._id, product.title)}>
              <IconifyIcon icon="bx:trash" className="fs-18" />
            </button>
          </div>
        ),
      },
    ],
    [actionsLocked, deleteShopProduct, onRefresh],
  )

  return (
    <ReactTable
      columns={columns}
      data={products}
      rowsPerPageList={[10, 20, 50]}
      pageSize={10}
      tableClass="text-nowrap mb-0"
      theadClass="bg-light bg-opacity-50"
      showPagination
    />
  )
}

export default ProductsListTable
