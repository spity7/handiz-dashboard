import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { Button } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const PRESETS = {
  courses: {
    empty: {
      icon: 'bx:book-open',
      title: 'No courses yet',
      description: 'Create your first course to publish lessons, pricing, and curriculum on Handiz.',
      actionLabel: 'Create course',
      actionTo: '/ecommerce/courses/create',
    },
    filtered: {
      icon: 'bx:filter-alt',
      title: 'No matching courses',
      description: 'Nothing matches your current filters. Clear them to see all courses again.',
    },
  },
  enrollments: {
    empty: {
      icon: 'bx:user-check',
      title: 'No enrollments yet',
      description: 'When students are enrolled in a course—by purchase or manually—they will appear here.',
      actionLabel: 'Enroll student',
    },
  },
  orders: {
    empty: {
      icon: 'bx:receipt',
      title: 'No orders yet',
      description: 'Course purchases will show up here with payment status and revenue details.',
    },
  },
  shopProducts: {
    empty: {
      icon: 'bx:store',
      title: 'No products yet',
      description: 'Add your first product to start selling on the Handiz shop. Published products appear on the storefront right away.',
      actionLabel: 'Add product',
      actionTo: '/ecommerce/products/create',
    },
  },
  shopCategories: {
    empty: {
      icon: 'bx:category',
      title: 'No categories yet',
      description: 'Categories help shoppers filter the storefront. Create one, then assign it to your products.',
      actionLabel: 'Add category',
    },
  },
  shopOrders: {
    empty: {
      icon: 'bx:receipt',
      title: 'No shop orders yet',
      description: 'Orders placed on the storefront will appear here with payment and fulfillment status.',
    },
    filtered: {
      icon: 'bx:search-alt',
      title: 'No matching orders',
      description: 'No orders match your search. Clear it to see all orders again.',
    },
  },
}

const LmsListEmptyState = ({ preset = 'courses', variant = 'empty', inTable = false, onClearFilters, onPrimaryAction }) => {
  const isFiltered = variant === 'filtered'
  const config = PRESETS[preset]
  const copy = isFiltered ? config.filtered : config.empty

  if (!copy) return null

  const showPrimaryAction = !isFiltered && copy.actionLabel && (copy.actionTo || onPrimaryAction)

  return (
    <div className={clsx('projects-list-empty', isFiltered && 'projects-list-empty--filtered', inTable && 'projects-list-empty--in-table')}>
      <div className={clsx('projects-list-empty__icon', isFiltered ? 'projects-list-empty__icon--filtered' : 'projects-list-empty__icon--empty')}>
        <IconifyIcon icon={copy.icon} className="fs-32" />
      </div>

      <h5 className="projects-list-empty__title">{copy.title}</h5>
      <p className="projects-list-empty__description">{copy.description}</p>

      {(isFiltered && onClearFilters) || showPrimaryAction ? (
        <div className="projects-list-empty__actions">
          {isFiltered && onClearFilters && (
            <Button variant="primary" onClick={onClearFilters}>
              <IconifyIcon icon="bx:reset" className="me-1" />
              Clear filters
            </Button>
          )}
          {showPrimaryAction &&
            (copy.actionTo ? (
              <Link to={copy.actionTo} className="btn btn-primary">
                <IconifyIcon icon="bx:plus" className="me-1" />
                {copy.actionLabel}
              </Link>
            ) : (
              <Button variant="primary" onClick={onPrimaryAction}>
                <IconifyIcon icon="bx:plus" className="me-1" />
                {copy.actionLabel}
              </Button>
            ))}
        </div>
      ) : null}
    </div>
  )
}

export default LmsListEmptyState
