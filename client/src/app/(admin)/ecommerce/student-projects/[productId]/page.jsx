import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import { getProductById } from '@/helpers/data'
import ProductDetailView from './components/ProductDetailView'
import ProductImages from './components/ProductImages'
import PageMetaData from '@/components/PageTitle'
import ProjectDetailSkeleton from '@/components/skeletons/ProjectDetailSkeleton'

const ProductDetail = () => {
  const [product, setProduct] = useState()
  const [loading, setLoading] = useState(true)
  const { productId } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    ;(async () => {
      if (!productId) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const data = await getProductById(productId)
        if (data) setProduct(data)
        else navigate('/pages/error-404-alt')
      } finally {
        setLoading(false)
      }
    })()
  }, [productId, navigate])

  if (loading) {
    return <ProjectDetailSkeleton title="Product Details" subName="Handiz" />
  }

  return (
    <>
      <PageBreadcrumb title="Product Details" subName="Handiz" />
      <PageMetaData title={product?.name ?? 'Product Details'} />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <Row>
                <Col lg={4}>{product && <ProductImages product={product} />}</Col>
                <Col lg={8}>{product && <ProductDetailView product={product} />}</Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}
export default ProductDetail
