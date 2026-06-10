import { useCallback } from 'react'
import Swal from 'sweetalert2'

/**
 * Standard confirmation dialog for destructive or state-changing actions.
 */
export default function useConfirmAction() {
  return useCallback(async ({ title, text, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'primary', icon = 'question', onConfirm }) => {
    const confirmButtonColor = variant === 'danger' ? '#dc3545' : variant === 'warning' ? '#ffc107' : '#0d6efd'

    const result = await Swal.fire({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonText: confirmLabel,
      cancelButtonText: cancelLabel,
      confirmButtonColor,
      reverseButtons: true,
    })

    if (result.isConfirmed && onConfirm) {
      return onConfirm()
    }
    return null
  }, [])
}
