import { useCallback } from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import ProjectsListTableSkeleton from '@/components/skeletons/ProjectsListTableSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import useFetchList from '@/hooks/useFetchList'
import HomepageAdsListTable from './components/HomepageAdsListTable'

const HomepageAdsPage = () => {
  const { getHomepageAds } = useGlobalContext()
  const fetchAds = useCallback(async () => getHomepageAds(true), [getHomepageAds])
  const { items: homepageAds, loading, refresh } = useFetchList(fetchAds)

  return (
    <>
      <PageMetaData title="Homepage Ads" />
      <PageBreadcrumb title="Homepage Ads" subName="Handiz" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between gap-3 align-items-start">
                <p className="text-muted mb-0 small">
                  Sponsored strip on the storefront homepage (above search). Links open in a new tab. Use https URLs only.
                </p>
                <Link to="/pages/homepage-ads/create" className="btn btn-primary d-flex align-items-center">
                  <IconifyIcon icon="bx:plus" className="me-1" />
                  Create ad
                </Link>
              </div>
            </CardBody>

            <div>
              {loading ? (
                <ProjectsListTableSkeleton variant="media-meta-order" />
              ) : homepageAds.length > 0 ? (
                <HomepageAdsListTable homepageAds={homepageAds} onRefresh={refresh} />
              ) : (
                <div className="text-center p-4">No homepage ads yet.</div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default HomepageAdsPage
