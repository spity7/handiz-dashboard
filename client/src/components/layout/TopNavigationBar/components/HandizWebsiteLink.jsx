import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { HANDIZ_WEBSITE_URL } from '@/config/api'

const HandizWebsiteLink = () => (
  <div className="topbar-item">
    <a
      href={HANDIZ_WEBSITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-sm btn-primary d-inline-flex align-items-center gap-2"
      title="Go to handiz.org">
      <IconifyIcon icon="iconamoon:home-duotone" className="fs-22" />
      <span className="d-none d-lg-inline fs-18 fw-medium">Visit Handiz</span>
    </a>
  </div>
)

export default HandizWebsiteLink
