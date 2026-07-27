import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUnsavedFormChanges } from '@/context/UnsavedFormChangesContext'

/**
 * Returns navigate() that confirms when unsaved form changes exist.
 */
export default function useGuardedNavigate() {
  const navigate = useNavigate()
  const { confirmDiscardUnsavedChanges } = useUnsavedFormChanges()

  return useCallback(
    async (to, options) => {
      const canProceed = await confirmDiscardUnsavedChanges()
      if (!canProceed) return false
      navigate(to, options)
      return true
    },
    [navigate, confirmDiscardUnsavedChanges],
  )
}
