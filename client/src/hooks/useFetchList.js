import { useCallback, useEffect, useState } from 'react'

const useFetchList = (fetchItems) => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchItems()
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching list:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [fetchItems])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { items, loading, refresh }
}

export default useFetchList
