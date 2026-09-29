import { useEffect, useState } from 'react'
import { Badge, Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import { useGlobalContext } from '@/context/useGlobalContext'

const ProductDetails = () => {
  const { productId } = useParams()
  const { getShopProductById } = useGlobalContext()
  const [product, setProduct] = useState(null)

  useEffect(() => {
    getShopProductById(productId).then(setProduct).catch(console.error)
  }, [getShopProductById, productId])

  if (!product) {
    return <p className="p-4">Loading…</p>
  }

  return (
    <>
      <PageMetaData title={product.title} />
      <PageBreadcrumb title={product.title} subName="Shop" />
      <Row>
        <Col lg={8}>
          <Card>
            <CardBody>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h4>{product.title}</h4>
                  <p className="text-muted mb-0">{product.sku || 'No SKU'}</p>
                </div>
                <Link to={`/ecommerce/products/edit/${product._id}`} className="btn btn-primary btn-sm">
                  Edit
                </Link>
              </div>
              <Badge bg={product.status === 'Published' ? 'success' : 'secondary'} className="me-2">
                {product.status}
              </Badge>
              {product.featured && <Badge bg="warning">Featured</Badge>}
              <p className="mt-3">{product.excerpt}</p>
              <div className="text-muted small" dangerouslySetInnerHTML={{ __html: product.description }} />
            </CardBody>
          </Card>
        </Col>
        <Col lg={4}>
          <Card>
            <CardBody>
              <img src={product.thumbnailUrl} alt="" className="img-fluid rounded mb-3" />
              <p>
                <strong>Price:</strong> ${Number(product.unitPrice ?? product.price).toFixed(2)}
              </p>
              <p>
                <strong>Stock:</strong> {product.trackInventory ? product.stockQuantity : 'Not tracked'}
              </p>
              {(product.gallery || []).length > 0 && (
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {product.gallery.map((url) => (
                    <img key={url} src={url} alt="" className="rounded" style={{ width: 72, height: 72, objectFit: 'cover' }} />
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default ProductDetails
