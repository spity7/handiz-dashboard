import { Placeholder } from 'react-bootstrap'

const CheckboxGroupSkeleton = ({ rows = 5 }) => (
  <div className="project-form-skeleton__checkbox-group placeholder-glow" aria-hidden="true">
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="d-flex align-items-center gap-2 mb-2">
        <Placeholder as="span" animation="glow" className="project-form-skeleton__checkbox rounded" />
        <Placeholder
          as="span"
          animation="glow"
          className="project-form-skeleton__checkbox-label rounded"
          style={{ width: `${55 + (index % 3) * 12}%` }}
        />
      </div>
    ))}
  </div>
)

export default CheckboxGroupSkeleton
