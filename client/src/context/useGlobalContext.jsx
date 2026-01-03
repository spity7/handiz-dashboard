import { createContext, useContext, useMemo } from 'react'
import axios from 'axios'

axios.defaults.withCredentials = true
// const BASE_URL = 'https://api.handiz.org/api/v1/'
const BASE_URL = 'http://localhost:5016/api/v1/'

const GlobalContext = createContext()

export const GlobalProvider = ({ children }) => {
  // Create a memoized axios instance
  const axiosInstance = useMemo(() => {
    const instance = axios.create({
      baseURL: BASE_URL,
      withCredentials: true,
    })

    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response || error.message)
        return Promise.reject(error)
      },
    )

    return instance
  }, [])

  const createService = async (data) => {
    const response = await axiosInstance.post('/services', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  }

  const getAllServices = async () => {
    const response = await axiosInstance.get('/services')
    return response.data.services
  }

  const getServiceById = async (id) => {
    const response = await axiosInstance.get(`/services/${id}`)
    return response.data.service
  }

  const updateService = async (id, data) => {
    const response = await axiosInstance.put(`/services/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.service
  }

  const deleteService = async (id) => {
    const response = await axiosInstance.delete(`/services/${id}`)
    return response.data
  }

  const createProject = async (data) => {
    const response = await axiosInstance.post('/projects', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  }

  const getAllProjects = async () => {
    const response = await axiosInstance.get('/projects')
    return response.data.projects
  }

  const getProjectById = async (id) => {
    const response = await axiosInstance.get(`/projects/${id}`)
    return response.data.project
  }

  const updateProject = async (id, data) => {
    const response = await axiosInstance.put(`/projects/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.project
  }

  const deleteProject = async (id) => {
    const response = await axiosInstance.delete(`/projects/${id}`)
    return response.data
  }

  const deleteProjectGalleryImage = async (id, imageUrl) => {
    const response = await axiosInstance.delete(`/projects/${id}/gallery`, {
      data: { imageUrl },
    })
    return response.data
  }

  const createCompetition = async (data) => {
    const response = await axiosInstance.post('/competitions', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  }

  const getAllCompetitions = async () => {
    const response = await axiosInstance.get('/competitions')
    return response.data.competitions
  }

  const getCompetitionById = async (id) => {
    const response = await axiosInstance.get(`/competitions/${id}`)
    return response.data.competition
  }

  const updateCompetition = async (id, data) => {
    const response = await axiosInstance.put(`/competitions/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.competition
  }

  const deleteCompetition = async (id) => {
    const response = await axiosInstance.delete(`/competitions/${id}`)
    return response.data
  }

  const deleteCompetitionGalleryImage = async (id, imageUrl) => {
    const response = await axiosInstance.delete(`/competitions/${id}/gallery`, {
      data: { imageUrl },
    })
    return response.data
  }

  return (
    <GlobalContext.Provider
      value={{
        createService,
        getAllServices,
        getServiceById,
        updateService,
        deleteService,
        createProject,
        getAllProjects,
        getProjectById,
        updateProject,
        deleteProject,
        deleteProjectGalleryImage,
        createCompetition,
        getAllCompetitions,
        getCompetitionById,
        updateCompetition,
        deleteCompetition,
        deleteCompetitionGalleryImage,
      }}>
      {children}
    </GlobalContext.Provider>
  )
}

export const useGlobalContext = () => useContext(GlobalContext)
