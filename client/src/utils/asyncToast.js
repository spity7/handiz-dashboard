import { toast } from 'react-toastify'
import { hideAsyncActionOverlay, showAsyncActionLoading } from '@/utils/asyncActionOverlay'

const TOAST_OPTS = { position: 'top-right' }

/**
 * Runs an async action with a centered loading overlay, then a top-right toast for success/error.
 */
export async function withAsyncToast(action, { loading, success, error } = {}) {
  showAsyncActionLoading(loading || 'Please wait…')
  try {
    const result = await action()
    hideAsyncActionOverlay()
    toast.success(success || 'Done.', TOAST_OPTS)
    return result
  } catch (err) {
    hideAsyncActionOverlay()
    const message = typeof error === 'function' ? error(err) : error || err?.response?.data?.message || 'Something went wrong.'
    toast.error(message, { ...TOAST_OPTS, autoClose: 5000 })
    throw err
  }
}

/** Top-right toast for validation and other inline notices. */
export function showCenterNotice(message, { variant = 'warning', autoCloseMs = 4000 } = {}) {
  const opts = { ...TOAST_OPTS, autoClose: autoCloseMs }
  if (variant === 'error') toast.error(message, opts)
  else if (variant === 'info') toast.info(message, opts)
  else if (variant === 'success') toast.success(message, opts)
  else toast.warning(message, opts)
}

export { hideAsyncActionOverlay }
