import { useCallback } from 'react'
import clsx from 'clsx'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import ProjectsListTableSkeleton from '@/components/skeletons/ProjectsListTableSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import useFetchList from '@/hooks/useFetchList'
import { useLmsAsyncBusy } from '@/context/LmsAsyncBusyContext'
import LmsListEmptyState from '../courses/components/LmsListEmptyState'
import ProductsListTable from './components/ProductsListTable'

const Products = () => {
  const { getAllShopProducts } = useGlobalContext()
  const fetchProducts = useCallback(async () => getAllShopProducts(), [getAllShopProducts])
  const { items: productsList, loading, refreshing, refresh } = useFetchList(fetchProducts)
  const listBusy = loading || refreshing
  useLmsAsyncBusy(listBusy)

  return (
    <>
      <PageMetaData title="Shop Products" />
      <PageBreadcrumb title="Shop Products" subName="Handiz" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between gap-3">
                <div className="d-flex gap-2">
                  <Link
                    to="/ecommerce/products/create"
                    className={clsx('btn btn-primary d-flex align-items-center', listBusy && 'disabled pe-none')}
                    aria-disabled={listBusy}
                    tabIndex={listBusy ? -1 : undefined}>
                    <IconifyIcon icon="bx:plus" className="me-1" />
                    Add Product
                  </Link>
                  <Link to="/ecommerce/shop/categories" className="btn btn-outline-secondary">
                    Categories
                  </Link>
                  <Link to="/ecommerce/shop/orders" className="btn btn-outline-secondary">
                    Orders
                  </Link>
                </div>
              </div>
            </CardBody>
            <div>
              {loading ? (
                <ProjectsListTableSkeleton variant="media-order" />
              ) : productsList.length > 0 ? (
                <ProductsListTable products={productsList} onRefresh={refresh} actionsLocked={listBusy} />
              ) : (
                <LmsListEmptyState preset="shopProducts" />
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default Products
