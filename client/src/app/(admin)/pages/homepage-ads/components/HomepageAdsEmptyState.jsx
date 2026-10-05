import clsx from 'clsx'
import { Link } from 'react-router-dom'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const TIPS = [
  'Appears on the storefront homepage, directly above search and filters.',
  'Each slot links to an external https URL and opens in a new tab.',
  'Use order numbers to control left-to-right placement; toggle Published when ready.',
]

const HomepageAdsEmptyState = ({ actionsDisabled = false }) => {
  return (
    <div className="projects-list-empty projects-list-empty--in-table homepage-ads-empty">
      <div className="projects-list-empty__icon projects-list-empty__icon--empty">
        <IconifyIcon icon="bx:layout" className="fs-32" />
      </div>

      <h5 className="projects-list-empty__title">No homepage ads yet</h5>
      <p className="projects-list-empty__description">
        Create sponsored placements for the horizontal strip visitors see before they search projects. Drafts stay hidden until you publish them.
      </p>

      <ul className="homepage-ads-empty__tips text-muted small text-start mx-auto mb-0">
        {TIPS.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>

      <div className="projects-list-empty__actions">
        <Link
          to="/pages/homepage-ads/create"
          className={clsx('btn btn-primary', actionsDisabled && 'disabled pe-none')}
          aria-disabled={actionsDisabled}
          tabIndex={actionsDisabled ? -1 : undefined}>
          <IconifyIcon icon="bx:plus" className="me-1" />
          Create your first ad
        </Link>
      </div>
    </div>
  )
}

export default HomepageAdsEmptyState
