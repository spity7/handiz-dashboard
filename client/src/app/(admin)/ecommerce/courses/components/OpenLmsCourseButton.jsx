import clsx from 'clsx'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { buildLmsCourseUrl } from '@/utils/lmsUrls'

const OpenLmsCourseButton = ({ slug, disabled = false, className }) => {
  if (!slug) return null

  return (
    <a
      href={buildLmsCourseUrl(slug)}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx('btn btn-sm btn-soft-info', disabled && 'disabled pe-none opacity-50', className)}
      title="Open course on LMS"
      aria-label="Open course on LMS"
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      onClick={(event) => {
        if (disabled) event.preventDefault()
      }}>
      <IconifyIcon icon="bx:link-external" aria-hidden="true" />
    </a>
  )
}

export default OpenLmsCourseButton
