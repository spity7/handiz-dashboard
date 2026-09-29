import { useEffect, useState } from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { useParams } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ProjectFormSkeleton from '@/components/skeletons/ProjectFormSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import GeneralDetailsForm from '../../create/components/GeneralDetailsForm'

const EditShopProduct = () => {
  const { id } = useParams()
  const { getShopProductById } = useGlobalContext()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getShopProductById(id)
        if (!cancelled) setProduct(data)
      } catch (e) {
        console.error(e)
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
      <PageBreadcrumb title="Edit Product" subName="Shop" />
      <PageMetaData title="Edit Product" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              {loading ? <ProjectFormSkeleton /> : product ? <GeneralDetailsForm mode="edit" product={product} /> : <p>Product not found</p>}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default EditShopProduct
