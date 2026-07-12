import { Spinner } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const CurriculumReorderDock = ({ hasChanges, saving, onConfirm, onCancel, onReset }) => (
  <div className="course-reorder-dock" role="region" aria-label="Reorder actions">
    <div className="course-reorder-dock__inner">
      <div className="course-reorder-dock__message">
        <IconifyIcon icon="bx:move" className="course-reorder-dock__icon" />
        <div>
          <strong>Reorder mode</strong>
          <div className="course-reorder-dock__hint small">
            {hasChanges ? 'You have unsaved order changes.' : 'Drag items or use the arrow buttons, then confirm.'}
          </div>
        </div>
        {hasChanges && <span className="course-reorder-dock__badge">Unsaved</span>}
      </div>
      <div className="course-reorder-dock__actions">
        {hasChanges && (
          <button type="button" className="course-reorder-dock__btn course-reorder-dock__btn--secondary" disabled={saving} onClick={onReset}>
            <IconifyIcon icon="bx:undo" className="course-reorder-dock__btn-icon" />
            Reset
          </button>
        )}
        <button type="button" className="course-reorder-dock__btn course-reorder-dock__btn--secondary" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="course-reorder-dock__btn course-reorder-dock__btn--primary"
          disabled={!hasChanges || saving}
          onClick={onConfirm}>
          {saving ? (
            <>
              <Spinner size="sm" animation="border" className="course-reorder-dock__spinner" />
              Saving…
            </>
          ) : (
            <>
              <IconifyIcon icon="bx:check" className="course-reorder-dock__btn-icon" />
              Confirm order
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)

export default CurriculumReorderDock
