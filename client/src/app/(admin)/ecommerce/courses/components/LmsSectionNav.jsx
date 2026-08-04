import clsx from 'clsx'
import { NavLink } from 'react-router-dom'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const NAV_ITEMS = [
  {
    to: '/ecommerce/courses/enrollments',
    label: 'Enrollments',
    hint: 'Student course access',
    icon: 'bx:user-check',
    accent: 'info',
  },
  {
    to: '/ecommerce/courses/lesson-devices',
    label: 'Lesson Devices',
    hint: 'One device per student',
    icon: 'bx:laptop',
    accent: 'warning',
  },
  {
    to: '/ecommerce/courses/orders',
    label: 'Orders',
    hint: 'Payments & revenue',
    icon: 'bx:receipt',
    accent: 'success',
  },
]

const LmsSectionNav = ({ className }) => (
  <nav className={clsx('lms-section-nav', className)} aria-label="LMS section navigation">
    <div className="lms-section-nav__track" role="tablist" aria-label="LMS sections">
      {NAV_ITEMS.map(({ to, label, hint, icon, accent }) => (
        <NavLink
          key={to}
          to={to}
          end
          role="tab"
          title={hint}
          className={({ isActive }) =>
            clsx('lms-section-nav__item', `lms-section-nav__item--${accent}`, isActive && 'lms-section-nav__item--active')
          }>
          <span className="lms-section-nav__icon-wrap" aria-hidden="true">
            <IconifyIcon icon={icon} className="lms-section-nav__icon" />
          </span>
          <span className="lms-section-nav__text">
            <span className="lms-section-nav__label">{label}</span>
            <span className="lms-section-nav__hint">{hint}</span>
          </span>
        </NavLink>
      ))}
    </div>
  </nav>
)

export default LmsSectionNav
