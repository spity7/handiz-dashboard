import { useCallback } from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import ProjectsListTableSkeleton from '@/components/skeletons/ProjectsListTableSkeleton'
import { useGlobalContext } from '@/context/useGlobalContext'
import useFetchList from '@/hooks/useFetchList'
import AiToolsListTable from './components/AiToolsListTable'

const AiTools = () => {
  const { getAllAiTools } = useGlobalContext()
  const fetchAiTools = useCallback(async () => getAllAiTools(), [getAllAiTools])
  const { items: aiToolsList, loading, refresh } = useFetchList(fetchAiTools)

  return (
    <>
      <PageMetaData title="AI Prompts" />
      <PageBreadcrumb title="AI Prompts" subName="Handiz" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between gap-3">
                <div className="d-flex flex-wrap gap-2">
                  <Link to="/ecommerce/aiTools/categories" className="btn btn-soft-primary d-flex align-items-center">
                    <IconifyIcon icon="bx:category" className="me-1" />
                    Categories
                  </Link>
                  <Link to="/ecommerce/aiTools/create" className="btn btn-primary d-flex align-items-center">
                    <IconifyIcon icon="bx:plus" className="me-1" />
                    Create AI Prompt
                  </Link>
                </div>
              </div>
            </CardBody>

            <div>
              {loading ? (
                <ProjectsListTableSkeleton variant="media-meta-order" />
              ) : aiToolsList.length > 0 ? (
                <AiToolsListTable aiTools={aiToolsList} onRefresh={refresh} />
              ) : (
                <div className="text-center p-4">No AI Prompts found</div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default AiTools
