import { useEffect, useState } from 'react'
import { Card, CardBody } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import { useGlobalContext } from '@/context/useGlobalContext'
import GeneralDetailsForm from '../../create/components/GeneralDetailsForm'
import ProductFormSkeleton from '../../components/ProductFormSkeleton'

const EditShopProduct = () => {
  const { id } = useParams()
  const { getShopProductById } = useGlobalContext()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const data = await getShopProductById(id)
        if (!cancelled) setProduct(data)
      } catch (e) {
        console.error(e)
        if (!cancelled) setProduct(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getShopProductById, id])

  return (
    <>
      <PageMetaData title="Edit Product" />
      <PageBreadcrumb title="Edit Product" subName="Shop" />
      {loading ? (
        <ProductFormSkeleton />
      ) : product ? (
        <GeneralDetailsForm key={product._id} mode="edit" product={product} />
      ) : (
        <Card>
          <CardBody className="text-center py-5">
            <h5 className="mb-2">Product not found</h5>
            <p className="text-muted mb-3">It may have been archived or deleted, or the link is out of date.</p>
            <Link to="/ecommerce/products" className="btn btn-primary">
              Back to products
            </Link>
          </CardBody>
        </Card>
      )}
    </>
  )
}

export default EditShopProduct
