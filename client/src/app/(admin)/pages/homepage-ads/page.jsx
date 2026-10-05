import { useCallback } from 'react'
import clsx from 'clsx'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useLmsAsyncBusy } from '@/context/LmsAsyncBusyContext'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import ProjectsListTableSkeleton from '@/components/skeletons/ProjectsListTableSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import useFetchList from '@/hooks/useFetchList'
import HomepageAdsEmptyState from './components/HomepageAdsEmptyState'
import HomepageAdsListTable from './components/HomepageAdsListTable'

const HomepageAdsPage = () => {
  const { getHomepageAds } = useGlobalContext()
  const fetchAds = useCallback(async () => getHomepageAds(true), [getHomepageAds])
  const { items: homepageAds, loading, refreshing, refresh } = useFetchList(fetchAds)
  const listBusy = loading || refreshing
  useLmsAsyncBusy(listBusy)

  const hasAds = !loading && homepageAds.length > 0
  const isEmpty = !loading && homepageAds.length === 0

  return (
    <>
      <PageMetaData title="Homepage Ads" />
      <PageBreadcrumb title="Homepage Ads" subName="Handiz" />
      <Row>
        <Col>
          <Card>
            {hasAds && (
              <CardBody className="border-bottom">
                <div className="d-flex flex-wrap justify-content-between gap-3 align-items-center">
                  <p className="text-muted mb-0 small">
                    Sponsored strip on the storefront homepage (above search). Links open in a new tab. Use https URLs only.
                  </p>
                  <Link
                    to="/pages/homepage-ads/create"
                    className={clsx('btn btn-primary d-inline-flex align-items-center', listBusy && 'disabled pe-none')}
                    aria-disabled={listBusy}
                    tabIndex={listBusy ? -1 : undefined}>
                    <IconifyIcon icon="bx:plus" className="me-1" />
                    Create ad
                  </Link>
                </div>
              </CardBody>
            )}

            <div>
              {loading ? (
                <ProjectsListTableSkeleton variant="media-meta-order" />
              ) : hasAds ? (
                <HomepageAdsListTable homepageAds={homepageAds} onRefresh={refresh} actionsLocked={listBusy} />
              ) : isEmpty ? (
                <HomepageAdsEmptyState actionsDisabled={listBusy} />
              ) : null}
            </div>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default HomepageAdsPage
