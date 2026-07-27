import { useMemo } from 'react'
import { mergeFormWithDefaults, pickComparableFormValues } from '@/utils/formFieldCompare'
import useRegisterUnsavedFormDirty from '@/hooks/useRegisterUnsavedFormDirty'

/**
 * Registers unsaved changes for react-hook-form by comparing defaults to live values (not RHF isDirty).
 */
export default function useRegisterRhfFormDirty(defaultValues, values, { extraDirty = false, omitFields = [] } = {}) {
  const fieldKeys = useMemo(() => Object.keys(defaultValues).filter((key) => !omitFields.includes(key)), [defaultValues, omitFields])

  const mergedValues = useMemo(() => mergeFormWithDefaults(defaultValues, values), [defaultValues, values])

  const snapshot = useMemo(() => pickComparableFormValues(defaultValues, fieldKeys, defaultValues), [defaultValues, fieldKeys])

  const current = useMemo(() => pickComparableFormValues(mergedValues, fieldKeys, defaultValues), [mergedValues, fieldKeys, defaultValues])

  useRegisterUnsavedFormDirty(snapshot, current, { extraDirty, trackingMode: 'defaults' })
}
