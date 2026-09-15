import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const LmsAsyncBusyContext = createContext({
  isAsyncBusy: false,
  registerAsyncBusy: () => () => {},
})

export const LmsAsyncBusyProvider = ({ children }) => {
  const [busyCount, setBusyCount] = useState(0)

  const registerAsyncBusy = useCallback(() => {
    setBusyCount((current) => current + 1)
    return () => {
      setBusyCount((current) => Math.max(0, current - 1))
    }
  }, [])

  const value = useMemo(
    () => ({
      isAsyncBusy: busyCount > 0,
      registerAsyncBusy,
    }),
    [busyCount, registerAsyncBusy],
  )

  return <LmsAsyncBusyContext.Provider value={value}>{children}</LmsAsyncBusyContext.Provider>
}

/** Register page-level async work (CRUD, uploads, refreshes) for unload guards. */
export const useLmsAsyncBusy = (active) => {
  const { registerAsyncBusy } = useContext(LmsAsyncBusyContext)

  useEffect(() => {
    if (!active) return undefined
    return registerAsyncBusy()
  }, [active, registerAsyncBusy])
}

export const useLmsAsyncBusyContext = () => useContext(LmsAsyncBusyContext)

export default LmsAsyncBusyContext
