import { useUnsavedFormChanges } from '@/context/UnsavedFormChangesContext'

/**
 * Returns a function that confirms when unsaved form changes exist, then runs the action.
 */
export default function useGuardedAction() {
  const { guardAction } = useUnsavedFormChanges()
  return guardAction
}
