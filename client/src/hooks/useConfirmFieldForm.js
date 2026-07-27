import { useCallback } from 'react'
import useConfirmFormSubmit from '@/hooks/useConfirmFormSubmit'
import { buildFormConfirmOptions } from '@/utils/formConfirm'

/**
 * Confirmation helper for simple create/update forms keyed by a field label.
 */
export default function useConfirmFieldForm(fieldLabel) {
  const confirmFormSubmit = useConfirmFormSubmit()

  return useCallback(
    (action, onConfirm) => confirmFormSubmit(buildFormConfirmOptions(action, { subject: `this ${fieldLabel}` }), onConfirm),
    [confirmFormSubmit, fieldLabel],
  )
}
