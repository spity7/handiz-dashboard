import { useEffect } from 'react'

export default function useRefetchOnFocus(callback) {
  useEffect(() => {
    const refetch = () => {
      if (document.visibilityState === 'visible') {
        callback()
      }
    }

    window.addEventListener('focus', refetch)
    document.addEventListener('visibilitychange', refetch)

    return () => {
      window.removeEventListener('focus', refetch)
      document.removeEventListener('visibilitychange', refetch)
    }
  }, [callback])
}
