import { Link } from 'react-router-dom'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const StudentProjectFieldManageLink = ({ to, title = 'Manage options' }) => (
  <Link
    to={to}
    className="btn btn-sm btn-soft-secondary d-inline-flex align-items-center justify-content-center p-2 lh-1"
    aria-label={title}
    title={title}>
    <IconifyIcon icon="bx:pencil" />
  </Link>
)

export default StudentProjectFieldManageLink
