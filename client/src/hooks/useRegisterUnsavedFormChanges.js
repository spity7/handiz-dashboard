import { useLayoutEffect, useId } from 'react'
import { useUnsavedFormChanges } from '@/context/UnsavedFormChangesContext'

/**
 * Registers a form's dirty state with the global unsaved-changes guard.
 */
export default function useRegisterUnsavedFormChanges(isDirty) {
  const id = useId()
  const { setFormDirty, clearFormDirty } = useUnsavedFormChanges()

  useLayoutEffect(() => {
    setFormDirty(id, isDirty)
    return () => clearFormDirty(id)
  }, [id, isDirty, setFormDirty, clearFormDirty])
}
