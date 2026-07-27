import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import { buildFormConfirmOptions } from '@/utils/formConfirm'

const UnsavedFormChangesContext = createContext(null)

export const UnsavedFormChangesProvider = ({ children }) => {
  const dirtyMapRef = useRef(new Map())
  const discardConfirmedRef = useRef(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const getHasUnsavedChanges = useCallback(() => {
    if (discardConfirmedRef.current) return false
    return [...dirtyMapRef.current.values()].some(Boolean)
  }, [])

  const syncDirtyState = useCallback(() => {
    setHasUnsavedChanges(getHasUnsavedChanges())
  }, [getHasUnsavedChanges])

  const setFormDirty = useCallback(
    (id, isDirty) => {
      if (!id) return
      if (!isDirty) {
        dirtyMapRef.current.delete(id)
      } else {
        dirtyMapRef.current.set(id, true)
      }
      syncDirtyState()
    },
    [syncDirtyState],
  )

  const clearFormDirty = useCallback(
    (id) => {
      if (!id) return
      dirtyMapRef.current.delete(id)
      syncDirtyState()
    },
    [syncDirtyState],
  )

  const clearAllUnsavedChanges = useCallback(() => {
    dirtyMapRef.current.clear()
    discardConfirmedRef.current = false
    syncDirtyState()
  }, [syncDirtyState])

  /** After a successful save that navigates away; ignores re-registered dirty until the route changes. */
  const acknowledgeSuccessfulFormSave = useCallback(() => {
    dirtyMapRef.current.clear()
    discardConfirmedRef.current = true
    syncDirtyState()
  }, [syncDirtyState])

  const confirmDiscardUnsavedChanges = useCallback(async () => {
    if (!getHasUnsavedChanges()) return true

    // Re-check after any synchronous dirty updates (avoid stale true from layout effects).
    await Promise.resolve()
    if (!getHasUnsavedChanges()) return true

    const options = buildFormConfirmOptions('discard')
    const confirmButtonColor = options.variant === 'danger' ? '#dc3545' : options.variant === 'warning' ? '#ffc107' : '#0d6efd'

    const result = await Swal.fire({
      title: options.title,
      text: options.text,
      icon: options.icon,
      showCancelButton: true,
      confirmButtonText: options.confirmLabel,
      cancelButtonText: options.cancelLabel || 'Cancel',
      confirmButtonColor,
      reverseButtons: true,
    })

    if (result.isConfirmed) {
      discardConfirmedRef.current = true
      dirtyMapRef.current.clear()
      syncDirtyState()
    }

    return result.isConfirmed
  }, [getHasUnsavedChanges, syncDirtyState])

  const guardAction = useCallback(
    async (action) => {
      if (!getHasUnsavedChanges()) return action()
      const canProceed = await confirmDiscardUnsavedChanges()
      if (!canProceed) return null
      return action()
    },
    [confirmDiscardUnsavedChanges, getHasUnsavedChanges],
  )

  const value = useMemo(
    () => ({
      hasUnsavedChanges,
      getHasUnsavedChanges,
      setFormDirty,
      clearFormDirty,
      clearAllUnsavedChanges,
      acknowledgeSuccessfulFormSave,
      confirmDiscardUnsavedChanges,
      guardAction,
      resetDiscardConfirmed: () => {
        discardConfirmedRef.current = false
      },
    }),
    [
      hasUnsavedChanges,
      getHasUnsavedChanges,
      setFormDirty,
      clearFormDirty,
      clearAllUnsavedChanges,
      acknowledgeSuccessfulFormSave,
      confirmDiscardUnsavedChanges,
      guardAction,
    ],
  )

  return <UnsavedFormChangesContext.Provider value={value}>{children}</UnsavedFormChangesContext.Provider>
}

export const useUnsavedFormChanges = () => {
  const context = useContext(UnsavedFormChangesContext)
  if (!context) {
    throw new Error('useUnsavedFormChanges must be used within UnsavedFormChangesProvider')
  }
  return context
}
