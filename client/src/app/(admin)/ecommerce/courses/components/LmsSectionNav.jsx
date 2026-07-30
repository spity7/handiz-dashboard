import clsx from 'clsx'
import { NavLink } from 'react-router-dom'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const NAV_ITEMS = [
  {
    to: '/ecommerce/courses/enrollments',
    label: 'Enrollments',
    icon: 'bx:user-check',
    accent: 'info',
  },
  {
    to: '/ecommerce/courses/orders',
    label: 'Orders',
    icon: 'bx:receipt',
    accent: 'success',
  },
]

const LmsSectionNav = () => (
  <nav className="lms-section-nav" aria-label="LMS section navigation">
    {NAV_ITEMS.map(({ to, label, icon, accent }) => (
      <NavLink
        key={to}
        to={to}
        className={({ isActive }) => clsx('lms-section-nav__item', `lms-section-nav__item--${accent}`, isActive && 'lms-section-nav__item--active')}>
        <span className="lms-section-nav__icon-wrap" aria-hidden="true">
          <IconifyIcon icon={icon} className="lms-section-nav__icon" />
        </span>
        <span className="lms-section-nav__label">{label}</span>
      </NavLink>
    ))}
  </nav>
)

export default LmsSectionNav
