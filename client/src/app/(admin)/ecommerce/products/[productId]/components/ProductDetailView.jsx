import clsx from 'clsx'
import { Badge, Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import ComponentContainerCard from '@/components/ComponentContainerCard'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { resolveProductPricing } from '@/utils/shopPricing'
import ProductDetailGallery from './ProductDetailGallery'

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const statusBadgeVariant = (status) => {
  if (status === 'Published') return 'success'
  if (status === 'Archived') return 'secondary'
  return 'warning'
}

const Fact = ({ label, children, className }) => (
  <div className={clsx('shop-product-detail__fact', className)}>
    <dt className="shop-product-detail__fact-label">{label}</dt>
    <dd className="shop-product-detail__fact-value">{children}</dd>
  </div>
)

const SummaryStat = ({ icon, label, children, tone }) => (
  <Card className={clsx('shop-product-detail__stat h-100', tone && `shop-product-detail__stat--${tone}`)}>
    <CardBody>
      <div className="shop-product-detail__stat-label">
        <IconifyIcon icon={icon} aria-hidden />
        {label}
      </div>
      <div className="shop-product-detail__stat-value">{children}</div>
    </CardBody>
  </Card>
)

const ProductDetailView = ({ product }) => {
  const pricing = resolveProductPricing(product)
  const listPrice = Number(product.listPrice ?? pricing.listPrice) || 0
  const unitPrice = Number(product.unitPrice ?? pricing.unitPrice) || 0
  const onSale = listPrice > 0 && unitPrice < listPrice
  const manualSale = Number(product.salePrice) || 0
  const categories = (product.categoryIds || []).map((c) => (typeof c === 'object' && c?.name ? c : null)).filter(Boolean)
  const trackInventory = product.trackInventory !== false
  const stock = Number(product.stockQuantity) || 0
  const lowStock = trackInventory && stock <= Number(product.lowStockThreshold ?? 5)
  const descriptionHtml = product.description?.trim()

  return (
    <div className="shop-product-detail">
      <Row className="g-3">
        <Col lg={5}>
          <ComponentContainerCard title="Media" description="Thumbnail and gallery images shown on the storefront.">
            <ProductDetailGallery product={product} />
          </ComponentContainerCard>
        </Col>

        <Col lg={7}>
          <Card className="shop-product-detail__overview mb-3">
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                <div className="shop-product-detail__status-row">
                  <Badge bg={statusBadgeVariant(product.status)}>{product.status}</Badge>
                  {product.featured && (
                    <Badge bg="warning" text="dark" className="icons-center gap-1">
                      <IconifyIcon icon="bxs:star" aria-hidden />
                      Featured
                    </Badge>
                  )}
                  {onSale && (
                    <Badge bg="danger" className="icons-center gap-1">
                      <IconifyIcon icon="bx:purchase-tag" aria-hidden />
                      On sale
                    </Badge>
                  )}
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <Link to="/ecommerce/products" className="btn btn-soft-secondary btn-sm icons-center">
                    <IconifyIcon icon="bx:arrow-back" className="me-1" aria-hidden />
                    All products
                  </Link>
                  <Link to={`/ecommerce/products/edit/${product._id}`} className="btn btn-primary btn-sm icons-center">
                    <IconifyIcon icon="bx:edit" className="me-1" aria-hidden />
                    Edit product
                  </Link>
                </div>
              </div>

              <h4 className="shop-product-detail__title mb-1">{product.title}</h4>
              <p className="shop-product-detail__sku text-muted mb-2">{product.sku || 'No SKU'}</p>
              {product.excerpt ? <p className="shop-product-detail__excerpt mb-0">{product.excerpt}</p> : null}
            </CardBody>
          </Card>

          <Row className="g-3 mb-3">
            <Col sm={4}>
              <SummaryStat icon="bx:dollar" label="Storefront price">
                <span className="shop-product-detail__price-current">{formatMoney(unitPrice)}</span>
                {onSale && (
                  <span className="shop-product-detail__price-compare text-muted text-decoration-line-through ms-2">{formatMoney(listPrice)}</span>
                )}
                {onSale && manualSale > 0 && (
                  <div className="shop-product-detail__price-note text-muted fs-13 mt-1">Sale price {formatMoney(manualSale)}</div>
                )}
              </SummaryStat>
            </Col>
            <Col sm={4}>
              <SummaryStat icon="bx:box" label="Inventory" tone={lowStock ? 'warning' : undefined}>
                {trackInventory ? (
                  <>
                    <span className={clsx(lowStock && 'text-warning fw-semibold')}>{stock} in stock</span>
                    <div className="shop-product-detail__stat-hint text-muted fs-13 mt-1">Low stock alert at {product.lowStockThreshold ?? 5}</div>
                  </>
                ) : (
                  <span className="text-muted">Not tracked</span>
                )}
              </SummaryStat>
            </Col>
            <Col sm={4}>
              <SummaryStat icon="bx:sort" label="Catalog">
                <span>Display order {product.sortOrder ?? 999}</span>
                <div className="shop-product-detail__stat-hint text-muted fs-13 mt-1">
                  Slug <code className="shop-product-detail__code">{product.slug || '—'}</code>
                </div>
              </SummaryStat>
            </Col>
          </Row>

          <div className="d-flex flex-column gap-3">
            <ComponentContainerCard title="Details" description="Identifiers and record timestamps." bodyClassName="pt-0">
              <dl className="shop-product-detail__facts">
                <Fact label="SKU">{product.sku || '—'}</Fact>
                <Fact label="Slug">{product.slug || '—'}</Fact>
                <Fact label="List price">{formatMoney(listPrice)}</Fact>
                <Fact label="Unit price">{formatMoney(unitPrice)}</Fact>
                <Fact label="Currency">{product.currency || 'USD'}</Fact>
                <Fact label="Track inventory">{trackInventory ? 'Yes' : 'No'}</Fact>
                {trackInventory && (
                  <>
                    <Fact label="Stock quantity">{stock}</Fact>
                    <Fact label="Low stock threshold">{product.lowStockThreshold ?? 5}</Fact>
                  </>
                )}
                <Fact label="Featured">{product.featured ? 'Yes' : 'No'}</Fact>
                <Fact label="Created">{formatDateTime(product.createdAt)}</Fact>
                <Fact label="Last updated">{formatDateTime(product.updatedAt)}</Fact>
              </dl>
            </ComponentContainerCard>

            <ComponentContainerCard
              title="Categories"
              description="Assigned storefront categories."
              bodyClassName="pt-0"
              headerAction={
                <Link to="/ecommerce/shop/categories" className="btn btn-sm btn-soft-secondary">
                  Manage
                </Link>
              }>
              {categories.length > 0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <Badge key={cat._id || cat.slug} bg="soft-primary" className="text-primary fs-13">
                      {cat.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0">No categories assigned.</p>
              )}
            </ComponentContainerCard>

            {descriptionHtml && (
              <ComponentContainerCard title="Description" description="Full product copy from the editor." bodyClassName="pt-0">
                <div className="shop-product-detail__description ql-editor" dangerouslySetInnerHTML={{ __html: product.description }} />
              </ComponentContainerCard>
            )}
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default ProductDetailView
