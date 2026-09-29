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
import OfficesListTable from './components/OfficesListTable'

const Offices = () => {
  const { getAllOffices } = useGlobalContext()
  const fetchOffices = useCallback(async () => getAllOffices(), [getAllOffices])
  const { items: officesList, loading, refreshing, refresh } = useFetchList(fetchOffices)
  const listBusy = loading || refreshing
  useLmsAsyncBusy(listBusy)

  return (
    <>
      <PageMetaData title="Offices List" />
      <PageBreadcrumb title="Offices List" subName="Handiz" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between gap-3">
                <div>
                  <Link
                    to="/ecommerce/offices/create"
                    className={clsx('btn btn-primary d-flex align-items-center', listBusy && 'disabled pe-none')}
                    aria-disabled={listBusy}
                    tabIndex={listBusy ? -1 : undefined}>
                    <IconifyIcon icon="bx:plus" className="me-1" />
                    Create Office
                  </Link>
                </div>
              </div>
            </CardBody>
            <div>
              {loading ? (
                <ProjectsListTableSkeleton variant="media-order" />
              ) : officesList.length > 0 ? (
                <OfficesListTable offices={officesList} onRefresh={refresh} actionsLocked={listBusy} />
              ) : (
                <div className="text-center p-4">No Offices Found</div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default Offices
