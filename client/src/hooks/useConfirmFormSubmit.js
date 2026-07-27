import { useCallback } from 'react'
import useConfirmAction from '@/hooks/useConfirmAction'

/**
 * Wraps a form submit handler with the standard confirmation dialog.
 */
export default function useConfirmFormSubmit() {
  const confirmAction = useConfirmAction()

  return useCallback(async (options, onConfirm) => confirmAction({ ...options, onConfirm }), [confirmAction])
}
