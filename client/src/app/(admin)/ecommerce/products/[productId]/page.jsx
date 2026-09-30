import { useEffect, useState } from 'react'
import { Alert, Col, Row } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import { useGlobalContext } from '@/context/useGlobalContext'
import ProductDetailSkeleton from './components/ProductDetailSkeleton'
import ProductDetailView from './components/ProductDetailView'

const ProductDetails = () => {
  const { productId } = useParams()
  const { getShopProductById } = useGlobalContext()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getShopProductById(productId)
      .then((data) => {
        if (!cancelled) setProduct(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Could not load this product.')
          setProduct(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [getShopProductById, productId])

  return (
    <>
      <PageMetaData title={product?.title || 'Product'} />
      <PageBreadcrumb title={product?.title || 'Product'} subName="Shop" />
      {loading ? (
        <ProductDetailSkeleton />
      ) : error ? (
        <Row>
          <Col lg={8}>
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
            <Link to="/ecommerce/products" className="btn btn-soft-secondary">
              Back to products
            </Link>
          </Col>
        </Row>
      ) : product ? (
        <ProductDetailView product={product} />
      ) : null}
    </>
  )
}

export default ProductDetails
