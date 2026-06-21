import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { downloadProjectImage } from '@/utils/downloadProjectImage'

const StudentProjectImageDownload = ({ projectId, label, ariaLabel = 'Download image', className = '' }) => (
  <button
    type="button"
    className={`student-project-detail__image-download${className ? ` ${className}` : ''}`}
    onClick={() => void downloadProjectImage(projectId, label)}
    aria-label={ariaLabel}>
    <IconifyIcon icon="bx:download" />
  </button>
)

export default StudentProjectImageDownload
