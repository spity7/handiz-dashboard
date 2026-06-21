import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card, CardBody, Col, Row } from 'react-bootstrap'
import Swal from 'sweetalert2'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import ProjectDetailSkeleton from '@/components/skeletons/ProjectDetailSkeleton'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useGlobalContext } from '@/context/useGlobalContext'
import { useAuthContext } from '@/context/useAuthContext'
import useConfirmAction from '@/hooks/useConfirmAction'
import { canPublishProject, canWriteProject, PROJECT_STATUS, ROLES, statusBadgeVariant } from '@/constants/roles'
import { isProfileComplete } from '@/utils/profileComplete'
import { downloadProjectImagesZip, getProjectDownloadableImages } from '@/utils/downloadProjectImage'
import { getStudentProjectPublicUrl } from '@/utils/studentProjectContact'
import StudentProjectDetailView from './components/StudentProjectDetailView'

const StudentProjectDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { getProjectById, deleteProject, publishProject, unpublishProject } = useGlobalContext()
  const confirmAction = useConfirmAction()

  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const profileComplete = isProfileComplete(user)
  const showAdminColumns = user?.role === ROLES.ADMIN || user?.role === ROLES.EDITOR
  const publicUrl = project ? getStudentProjectPublicUrl(project) : null

  const loadProject = useCallback(async () => {
    if (!id) return null

    try {
      const data = await getProjectById(id)
      return data
    } catch (error) {
      const status = error?.response?.status
      if (status === 404 || status === 403) {
        navigate('/pages/error-404-alt')
        return null
      }
      throw error
    }
  }, [getProjectById, id, navigate])

  useEffect(() => {
    let active = true

    ;(async () => {
      if (!id) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const data = await loadProject()
        if (active && data) setProject(data)
      } catch {
        if (active) {
          Swal.fire('Error', 'Failed to load project.', 'error')
          navigate('/ecommerce/student-projects')
        }
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [id, loadProject, navigate])

  const refreshProject = async () => {
    const data = await loadProject()
    if (data) setProject(data)
  }

  const handleDelete = async () => {
    const staffDeleteCopy = showAdminColumns
      ? 'This will soft-delete the project. It will be hidden from handiz.org and can be restored from the Deleted filter.'
      : 'This will remove your project from the dashboard and public site. Contact an admin or editor if you need it restored.'

    await confirmAction({
      title: 'Delete project?',
      text: staffDeleteCopy,
      confirmLabel: 'Delete',
      variant: 'danger',
      icon: 'warning',
      onConfirm: async () => {
        try {
          await deleteProject(project._id)
          await Swal.fire('Deleted', 'Project has been soft-deleted.', 'success')
          navigate('/ecommerce/student-projects')
        } catch (error) {
          Swal.fire('Error', error?.response?.data?.message || 'Delete failed', 'error')
        }
      },
    })
  }

  const handlePublish = async () => {
    await confirmAction({
      title: 'Publish project?',
      text: 'This project will appear on handiz.org.',
      confirmLabel: 'Publish',
      variant: 'primary',
      onConfirm: async () => {
        try {
          await publishProject(project._id)
          await Swal.fire('Published', 'Project is now live.', 'success')
          await refreshProject()
        } catch (error) {
          Swal.fire('Error', error?.response?.data?.message || 'Publish failed', 'error')
        }
      },
    })
  }

  const handleUnpublish = async () => {
    await confirmAction({
      title: 'Unpublish project?',
      text: 'This project will be hidden from handiz.org.',
      confirmLabel: 'Unpublish',
      variant: 'warning',
      icon: 'warning',
      onConfirm: async () => {
        try {
          await unpublishProject(project._id)
          await Swal.fire('Unpublished', 'Project is no longer public.', 'success')
          await refreshProject()
        } catch (error) {
          Swal.fire('Error', error?.response?.data?.message || 'Unpublish failed', 'error')
        }
      },
    })
  }

  if (loading) {
    return <ProjectDetailSkeleton title="Student Project" subName="Handiz" />
  }

  if (!project) return null

  const deleted = Boolean(project.deletedAt)
  const showWrite = canWriteProject(user, project) && !deleted
  const showPublish = canPublishProject(user, project) && !deleted
  const editTarget = profileComplete
    ? `/ecommerce/student-projects/edit/${project._id}`
    : { pathname: '/pages/account', state: { from: `/ecommerce/student-projects/edit/${project._id}` } }
  const downloadableImages = getProjectDownloadableImages(project)

  const handleDownloadAll = async () => {
    if (!downloadableImages.length || downloadingAll) return

    setDownloadingAll(true)
    try {
      await downloadProjectImagesZip(project._id, project.title)
      await Swal.fire('Downloaded', 'All project images saved as a ZIP file.', 'success')
    } catch {
      Swal.fire('Error', 'Some images could not be downloaded.', 'error')
    } finally {
      setDownloadingAll(false)
    }
  }

  return (
    <>
      <PageMetaData title={project.title} />
      <PageBreadcrumb title="Student Project" subName="Handiz" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <div className="student-project-detail__toolbar d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <Link to="/ecommerce/student-projects" className="btn btn-soft-secondary btn-sm d-inline-flex align-items-center">
                    <IconifyIcon icon="bx:arrow-back" className="me-1" />
                    Back to list
                  </Link>
                  {downloadableImages.length > 0 && (
                    <Button
                      variant="soft-primary"
                      size="sm"
                      className="d-inline-flex align-items-center"
                      onClick={handleDownloadAll}
                      disabled={downloadingAll}>
                      <IconifyIcon icon="bx:download" className="me-1" />
                      {downloadingAll ? 'Downloading…' : 'Download All'}
                    </Button>
                  )}
                </div>

                <div className="d-flex flex-wrap gap-2 align-items-center">
                  {project.status && !deleted && (
                    <Badge bg={statusBadgeVariant(project.status)} className="d-none d-sm-inline">
                      {project.status}
                    </Badge>
                  )}
                  {publicUrl && project.status === PROJECT_STATUS.PUBLISHED && !deleted && (
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-soft-info d-inline-flex align-items-center">
                      <IconifyIcon icon="bx:link-external" className="me-1" />
                      View on handiz.org
                    </a>
                  )}
                  {showWrite && (
                    <Link
                      to={editTarget}
                      className="btn btn-sm btn-soft-secondary d-inline-flex align-items-center"
                      title={profileComplete ? 'Edit project' : 'Verify your account to edit'}>
                      <IconifyIcon icon="bx:edit" className="me-1" />
                      Edit
                    </Link>
                  )}
                  {showPublish && project.status !== PROJECT_STATUS.PUBLISHED && (
                    <Button variant="soft-success" size="sm" className="d-inline-flex align-items-center" onClick={handlePublish}>
                      <IconifyIcon icon="bx:upload" className="me-1" />
                      Publish
                    </Button>
                  )}
                  {showPublish && project.status === PROJECT_STATUS.PUBLISHED && (
                    <Button variant="soft-warning" size="sm" className="d-inline-flex align-items-center" onClick={handleUnpublish}>
                      <IconifyIcon icon="bx:hide" className="me-1" />
                      Unpublish
                    </Button>
                  )}
                  {showWrite && (
                    <Button variant="soft-danger" size="sm" className="d-inline-flex align-items-center" onClick={handleDelete}>
                      <IconifyIcon icon="bx:trash" className="me-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              <StudentProjectDetailView project={project} user={user} />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default StudentProjectDetail
