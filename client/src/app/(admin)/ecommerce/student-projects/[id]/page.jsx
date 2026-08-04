import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card, CardBody, Col, Row } from 'react-bootstrap'
import { withAsyncToast, showCenterNotice } from '@/utils/asyncToast'
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
import { mergeProjectForReview, projectNeedsApproval, projectPendingReviewLabel } from '@/utils/projectPendingChanges'
import StudentProjectDetailView from './components/StudentProjectDetailView'
const StudentProjectDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { getProjectById, deleteProject, publishProject, unpublishProject, rejectPendingChanges } = useGlobalContext()
  const confirmAction = useConfirmAction()

  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const actionsDisabled = actionLoading || downloadingAll
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
          showCenterNotice('Failed to load project.', { variant: 'error' })
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
          setActionLoading(true)
          await withAsyncToast(() => deleteProject(project._id), {
            loading: 'Deleting project…',
            success: 'Project has been soft-deleted.',
            error: (error) => error?.response?.data?.message || 'Delete failed',
          })
          navigate('/ecommerce/student-projects')
        } catch {
          // Error toast already shown
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const handlePublish = async () => {
    const approvingChanges = project.hasPendingChanges && project.status === PROJECT_STATUS.PUBLISHED

    await confirmAction({
      title: approvingChanges ? 'Approve pending changes?' : 'Publish project?',
      text: approvingChanges ? 'The submitted edits will replace the live version on handiz.org.' : 'This project will appear on handiz.org.',
      confirmLabel: approvingChanges ? 'Approve' : 'Publish',
      variant: 'primary',
      onConfirm: async () => {
        try {
          setActionLoading(true)
          await withAsyncToast(() => publishProject(project._id), {
            loading: approvingChanges ? 'Approving changes…' : 'Publishing project…',
            success: approvingChanges ? 'Pending changes are now live.' : 'Project is now live.',
            error: (error) => error?.response?.data?.message || 'Publish failed',
          })
          await refreshProject()
        } catch {
          // Error toast already shown
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const handleRejectPending = async () => {
    await confirmAction({
      title: 'Reject pending changes?',
      text: 'The submitted edits will be discarded. The live version on handiz.org stays unchanged.',
      confirmLabel: 'Reject changes',
      variant: 'danger',
      icon: 'warning',
      onConfirm: async () => {
        try {
          setActionLoading(true)
          await withAsyncToast(() => rejectPendingChanges(project._id), {
            loading: 'Rejecting changes…',
            success: 'Pending changes were discarded.',
            error: (error) => error?.response?.data?.message || 'Reject failed',
          })
          await refreshProject()
        } catch {
          // Error toast already shown
        } finally {
          setActionLoading(false)
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
          setActionLoading(true)
          await withAsyncToast(() => unpublishProject(project._id), {
            loading: 'Unpublishing project…',
            success: 'Project is no longer public.',
            error: (error) => error?.response?.data?.message || 'Unpublish failed',
          })
          await refreshProject()
        } catch {
          // Error toast already shown
        } finally {
          setActionLoading(false)
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
  const downloadableImages = getProjectDownloadableImages(mergeProjectForReview(project, showAdminColumns))
  const displayProject = mergeProjectForReview(project, showAdminColumns)
  const pendingReviewLabel = projectPendingReviewLabel(project)
  const canApprove = showPublish && projectNeedsApproval(project)

  const handleDownloadAll = async () => {
    if (!downloadableImages.length || downloadingAll) return

    setDownloadingAll(true)
    try {
      await withAsyncToast(() => downloadProjectImagesZip(project._id, project.title), {
        loading: 'Preparing download…',
        success: 'All project images saved as a ZIP file.',
        error: 'Some images could not be downloaded.',
      })
    } catch {
      // Error toast already shown
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
                  <Link
                    to="/ecommerce/student-projects"
                    className="btn btn-soft-secondary btn-sm d-inline-flex align-items-center"
                    aria-disabled={actionsDisabled}
                    style={actionsDisabled ? { pointerEvents: 'none', opacity: 0.65 } : undefined}
                    onClick={(e) => actionsDisabled && e.preventDefault()}>
                    <IconifyIcon icon="bx:arrow-back" className="me-1" />
                    Back to list
                  </Link>
                  {downloadableImages.length > 0 && (
                    <Button
                      variant="soft-primary"
                      size="sm"
                      className="d-inline-flex align-items-center"
                      onClick={handleDownloadAll}
                      disabled={downloadingAll || actionsDisabled}>
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
                  {pendingReviewLabel && !deleted && (
                    <Badge bg="warning" className="d-none d-sm-inline">
                      {pendingReviewLabel}
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
                      title={profileComplete ? 'Edit project' : 'Verify your account to edit'}
                      aria-disabled={actionsDisabled}
                      style={actionsDisabled ? { pointerEvents: 'none', opacity: 0.65 } : undefined}
                      onClick={(e) => actionsDisabled && e.preventDefault()}>
                      <IconifyIcon icon="bx:edit" className="me-1" />
                      Edit
                    </Link>
                  )}
                  {canApprove && (
                    <Button
                      variant="soft-success"
                      size="sm"
                      className="d-inline-flex align-items-center"
                      onClick={handlePublish}
                      disabled={actionsDisabled}>
                      <IconifyIcon icon="bx:upload" className="me-1" />
                      {project.hasPendingChanges && project.status === PROJECT_STATUS.PUBLISHED ? 'Approve changes' : 'Publish'}
                    </Button>
                  )}
                  {showPublish && project.hasPendingChanges && project.status === PROJECT_STATUS.PUBLISHED && (
                    <Button
                      variant="soft-danger"
                      size="sm"
                      className="d-inline-flex align-items-center"
                      onClick={handleRejectPending}
                      disabled={actionsDisabled}>
                      <IconifyIcon icon="bx:x" className="me-1" />
                      Reject changes
                    </Button>
                  )}
                  {showPublish && project.status === PROJECT_STATUS.PUBLISHED && (
                    <Button
                      variant="soft-warning"
                      size="sm"
                      className="d-inline-flex align-items-center"
                      onClick={handleUnpublish}
                      disabled={actionsDisabled}>
                      <IconifyIcon icon="bx:hide" className="me-1" />
                      Unpublish
                    </Button>
                  )}
                  {showWrite && (
                    <Button
                      variant="soft-danger"
                      size="sm"
                      className="d-inline-flex align-items-center"
                      onClick={handleDelete}
                      disabled={actionsDisabled}>
                      <IconifyIcon icon="bx:trash" className="me-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              <StudentProjectDetailView project={displayProject} user={user} liveProject={project} />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default StudentProjectDetail
