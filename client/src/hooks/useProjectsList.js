import { useCallback, useEffect, useState } from 'react'

const useProjectsList = (getAllProjects) => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllProjects()
      setProjects(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching projects:', error)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [getAllProjects])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return { projects, loading, refresh: fetchProjects }
}

export default useProjectsList
