import { useLayoutEffect, useMemo, useState } from 'react'
import useRegisterUnsavedFormChanges from '@/hooks/useRegisterUnsavedFormChanges'
import { formsDiffer, normalizeForDirtyCompare } from '@/utils/formDirtyCompare'
import { pickComparableFormValues } from '@/utils/formFieldCompare'

/**
 * @param {'defaults' | 'snapshot'} trackingMode
 *   - defaults: create forms — dirty only when values differ from defaultValues
 *   - snapshot: edit forms — baseline after sync with server snapshot
 */
export default function useRegisterUnsavedFormDirty(snapshot, current, { enabled = true, extraDirty = false, trackingMode = 'snapshot' } = {}) {
  const [baseline, setBaseline] = useState(null)

  const compareSnapshot = useMemo(() => {
    if (snapshot == null) return snapshot
    const keys = Object.keys(snapshot)
    return pickComparableFormValues(snapshot, keys, snapshot)
  }, [snapshot])

  const compareCurrent = useMemo(() => {
    if (snapshot == null) return current
    const keys = Object.keys(snapshot)
    return pickComparableFormValues(current, keys, snapshot)
  }, [snapshot, current])

  useLayoutEffect(() => {
    if (trackingMode !== 'snapshot' || !enabled || compareSnapshot == null) {
      setBaseline(null)
      return
    }

    const matchesSnapshot = !formsDiffer(compareSnapshot, compareCurrent)

    if (baseline === null && matchesSnapshot) {
      setBaseline(normalizeForDirtyCompare(compareCurrent))
      return
    }

    if (baseline !== null && matchesSnapshot && formsDiffer(baseline, compareSnapshot)) {
      setBaseline(normalizeForDirtyCompare(compareCurrent))
    }
  }, [trackingMode, enabled, compareSnapshot, compareCurrent, baseline])

  const isDirty = useMemo(() => {
    if (!enabled || compareSnapshot == null) return Boolean(extraDirty)
    if (extraDirty) return true

    if (trackingMode === 'defaults') {
      return formsDiffer(compareSnapshot, compareCurrent)
    }

    if (!formsDiffer(compareSnapshot, compareCurrent)) return false
    if (baseline === null) return false
    return formsDiffer(baseline, compareCurrent)
  }, [enabled, compareSnapshot, compareCurrent, extraDirty, baseline, trackingMode])

  useRegisterUnsavedFormChanges(isDirty)
}
