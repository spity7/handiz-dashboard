import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Spinner } from 'react-bootstrap'
import { getAsyncActionOverlayState, subscribeAsyncActionOverlay } from '@/utils/asyncActionOverlay'

/** Centered loading overlay with dimmed backdrop (success/error use top-right toasts). */
const AsyncActionOverlay = () => {
  const [overlayState, setOverlayState] = useState(getAsyncActionOverlayState)

  useEffect(() => subscribeAsyncActionOverlay(setOverlayState), [])

  if (!overlayState.open) return null

  return createPortal(
    <div className="async-action-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="async-action-overlay__backdrop" aria-hidden="true" />
      <div className="async-action-overlay__panel async-action-overlay__panel--loading">
        <Spinner animation="border" role="status" className="async-action-overlay__spinner" />
        <p className="async-action-overlay__message">{overlayState.message}</p>
      </div>
    </div>,
    document.body,
  )
}

export default AsyncActionOverlay
