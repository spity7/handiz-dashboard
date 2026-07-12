import { useCallback, useEffect, useRef, useState } from 'react'

const useFetchList = (fetchItems) => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const hasLoadedRef = useRef(false)

  const refresh = useCallback(async () => {
    if (!hasLoadedRef.current) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      const data = await fetchItems()
      setItems(Array.isArray(data) ? data : [])
      hasLoadedRef.current = true
    } catch (error) {
      console.error('Error fetching list:', error)
      setItems([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [fetchItems])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { items, loading, refreshing, refresh }
}

export default useFetchList
