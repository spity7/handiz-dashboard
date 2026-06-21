import clsx from 'clsx'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { getInstagramUrl, getWhatsAppUrl } from '@/utils/profileComplete'

const displayName = (user) => user?.username || user?.firstname || 'user'

const ContactButton = ({ href, className, tooltip, ariaLabel, icon }) => (
  <OverlayTrigger placement="top" overlay={<Tooltip>{tooltip}</Tooltip>}>
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={ariaLabel}>
      <IconifyIcon icon={icon} className="user-contact-buttons__icon" />
    </a>
  </OverlayTrigger>
)

const UserContactButtons = ({ user, whatsappMessage, className, emptyLabel = '—' }) => {
  const whatsappUrl = getWhatsAppUrl(user, whatsappMessage)
  const instagramUrl = getInstagramUrl(user)
  const name = displayName(user)

  if (!whatsappUrl && !instagramUrl) {
    return <span className="text-muted">{emptyLabel}</span>
  }

  const whatsappTooltip = whatsappMessage ? `WhatsApp about ${name}'s project` : `WhatsApp ${name}`

  return (
    <div className={clsx('user-contact-buttons d-flex', className)}>
      {whatsappUrl && (
        <ContactButton
          href={whatsappUrl}
          className="user-contact-buttons__btn user-contact-buttons__btn--whatsapp"
          tooltip={whatsappTooltip}
          ariaLabel={`Open WhatsApp for ${name}`}
          icon="bxl:whatsapp"
        />
      )}
      {instagramUrl && (
        <ContactButton
          href={instagramUrl}
          className="user-contact-buttons__btn user-contact-buttons__btn--instagram"
          tooltip={user?.username ? `Instagram · @${user.username}` : 'Open Instagram profile'}
          ariaLabel={`Open Instagram for ${name}`}
          icon="lucide:instagram"
        />
      )}
    </div>
  )
}

export default UserContactButtons
