import { createContext, useContext, useMemo } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '@/config/api'

axios.defaults.withCredentials = true

const GlobalContext = createContext()

export const GlobalProvider = ({ children }) => {
  // Create a memoized axios instance
  const axiosInstance = useMemo(() => {
    const instance = axios.create({
      baseURL: API_BASE_URL,
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

  const publishProject = async (id) => {
    const response = await axiosInstance.patch(`/projects/${id}/publish`)
    return response.data
  }

  const unpublishProject = async (id) => {
    const response = await axiosInstance.patch(`/projects/${id}/unpublish`)
    return response.data
  }

  const getEmployees = async (params = {}) => {
    const response = await axiosInstance.get('/get-all-employees', { params })
    return response.data
  }

  const updateEmployee = async (id, data) => {
    const response = await axiosInstance.put(`/update-employee/${id}`, data)
    return response.data
  }

  const deleteEmployee = async (id) => {
    const response = await axiosInstance.delete(`/delete-employee/${id}`)
    return response.data
  }

  const getNotifications = async (params = {}) => {
    const response = await axiosInstance.get('/notifications', { params })
    return response.data
  }

  const getUnreadNotificationCount = async () => {
    const response = await axiosInstance.get('/notifications/unread-count')
    return response.data.count
  }

  const markNotificationRead = async (id) => {
    const response = await axiosInstance.patch(`/notifications/${id}/read`)
    return response.data
  }

  const markAllNotificationsRead = async () => {
    const response = await axiosInstance.patch('/notifications/read-all')
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

  const createAiTool = async (data) => {
    // Let axios set multipart boundary; manual Content-Type breaks field/file parsing
    const response = await axiosInstance.post('/aiTools', data)
    return response.data
  }

  const getAllAiTools = async () => {
    const response = await axiosInstance.get('/aiTools')
    return response.data.aiTools
  }

  const getAiToolById = async (id) => {
    const response = await axiosInstance.get(`/aiTools/${id}`)
    return response.data.aiTool
  }

  const updateAiTool = async (id, data) => {
    const response = await axiosInstance.put(`/aiTools/${id}`, data)
    return response.data.aiTool
  }

  const deleteAiTool = async (id) => {
    const response = await axiosInstance.delete(`/aiTools/${id}`)
    return response.data
  }

  const deleteAiToolGalleryImage = async (id, imageUrl) => {
    const response = await axiosInstance.delete(`/aiTools/${id}/gallery`, {
      data: { imageUrl },
    })
    return response.data
  }

  const getAiPromptCategories = async () => {
    const response = await axiosInstance.get('/aiTools/categories')
    return response.data.categories
  }

  const createAiPromptCategory = async (name) => {
    const response = await axiosInstance.post('/aiTools/categories', { name })
    return response.data.category
  }

  const updateAiPromptCategory = async (id, name) => {
    const response = await axiosInstance.put(`/aiTools/categories/${id}`, { name })
    return response.data.category
  }

  const deleteAiPromptCategory = async (id) => {
    const response = await axiosInstance.delete(`/aiTools/categories/${id}`)
    return response.data
  }

  const getStudentProjectConcepts = async () => {
    const response = await axiosInstance.get('/projects/concepts')
    return response.data.concepts
  }

  const createStudentProjectConcept = async (name) => {
    const response = await axiosInstance.post('/projects/concepts', { name })
    return response.data.concept
  }

  const updateStudentProjectConcept = async (id, name) => {
    const response = await axiosInstance.put(`/projects/concepts/${id}`, { name })
    return response.data.concept
  }

  const deleteStudentProjectConcept = async (id) => {
    const response = await axiosInstance.delete(`/projects/concepts/${id}`)
    return response.data
  }

  const getStudentProjectTypes = async () => {
    const response = await axiosInstance.get('/projects/types')
    return response.data.types
  }

  const createStudentProjectType = async (name) => {
    const response = await axiosInstance.post('/projects/types', { name })
    return response.data.type
  }

  const updateStudentProjectType = async (id, name) => {
    const response = await axiosInstance.put(`/projects/types/${id}`, { name })
    return response.data.type
  }

  const deleteStudentProjectType = async (id) => {
    const response = await axiosInstance.delete(`/projects/types/${id}`)
    return response.data
  }

  const getStudentProjectCategories = async () => {
    const response = await axiosInstance.get('/projects/categories')
    return response.data.categories
  }

  const createStudentProjectCategory = async (name) => {
    const response = await axiosInstance.post('/projects/categories', { name })
    return response.data.category
  }

  const updateStudentProjectCategory = async (id, name) => {
    const response = await axiosInstance.put(`/projects/categories/${id}`, { name })
    return response.data.category
  }

  const deleteStudentProjectCategory = async (id) => {
    const response = await axiosInstance.delete(`/projects/categories/${id}`)
    return response.data
  }

  const getStudentProjectYears = async () => {
    const response = await axiosInstance.get('/projects/years')
    return response.data.years
  }

  const createStudentProjectYear = async (name) => {
    const response = await axiosInstance.post('/projects/years', { name })
    return response.data.year
  }

  const updateStudentProjectYear = async (id, name) => {
    const response = await axiosInstance.put(`/projects/years/${id}`, { name })
    return response.data.year
  }

  const deleteStudentProjectYear = async (id) => {
    const response = await axiosInstance.delete(`/projects/years/${id}`)
    return response.data
  }

  const getStudentProjectLocations = async () => {
    const response = await axiosInstance.get('/projects/locations')
    return response.data.locations
  }

  const createStudentProjectLocation = async (name) => {
    const response = await axiosInstance.post('/projects/locations', { name })
    return response.data.location
  }

  const updateStudentProjectLocation = async (id, name) => {
    const response = await axiosInstance.put(`/projects/locations/${id}`, { name })
    return response.data.location
  }

  const deleteStudentProjectLocation = async (id) => {
    const response = await axiosInstance.delete(`/projects/locations/${id}`)
    return response.data
  }

  const getStudentProjectUniversities = async () => {
    const response = await axiosInstance.get('/projects/universities')
    return response.data.universities
  }

  const createStudentProjectUniversity = async (name) => {
    const response = await axiosInstance.post('/projects/universities', { name })
    return response.data.university
  }

  const updateStudentProjectUniversity = async (id, name) => {
    const response = await axiosInstance.put(`/projects/universities/${id}`, { name })
    return response.data.university
  }

  const deleteStudentProjectUniversity = async (id) => {
    const response = await axiosInstance.delete(`/projects/universities/${id}`)
    return response.data
  }

  const createOffice = async (data) => {
    const response = await axiosInstance.post('/offices', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  }

  const getAllOffices = async () => {
    const response = await axiosInstance.get('/offices')
    return response.data.offices
  }

  const getOfficeById = async (id) => {
    const response = await axiosInstance.get(`/offices/${id}`)
    return response.data.office
  }

  const updateOffice = async (id, data) => {
    const response = await axiosInstance.put(`/offices/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.office
  }

  const deleteOffice = async (id) => {
    const response = await axiosInstance.delete(`/offices/${id}`)
    return response.data
  }

  const deleteOfficeGalleryImage = async (id, imageUrl) => {
    const response = await axiosInstance.delete(`/offices/${id}/gallery`, {
      data: { imageUrl },
    })
    return response.data
  }

  const createAboutUs = async (data) => {
    const response = await axiosInstance.post('/about-us', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  }

  const getAboutUs = async () => {
    const response = await axiosInstance.get('/about-us')
    return response.data.aboutUs
  }

  const getAboutUsById = async (id) => {
    const response = await axiosInstance.get(`/about-us/${id}`)
    return response.data.aboutUs
  }

  const updateAboutUs = async (id, data) => {
    const response = await axiosInstance.put(`/about-us/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.aboutUs
  }

  const deleteAboutUs = async (id) => {
    const response = await axiosInstance.delete(`/about-us/${id}`)
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
        publishProject,
        unpublishProject,
        deleteProjectGalleryImage,
        getEmployees,
        updateEmployee,
        deleteEmployee,
        getNotifications,
        getUnreadNotificationCount,
        markNotificationRead,
        markAllNotificationsRead,
        createCompetition,
        getAllCompetitions,
        getCompetitionById,
        updateCompetition,
        deleteCompetition,
        deleteCompetitionGalleryImage,
        createAiTool,
        getAllAiTools,
        getAiToolById,
        updateAiTool,
        deleteAiTool,
        deleteAiToolGalleryImage,
        getAiPromptCategories,
        createAiPromptCategory,
        updateAiPromptCategory,
        deleteAiPromptCategory,
        getStudentProjectConcepts,
        createStudentProjectConcept,
        updateStudentProjectConcept,
        deleteStudentProjectConcept,
        getStudentProjectTypes,
        createStudentProjectType,
        updateStudentProjectType,
        deleteStudentProjectType,
        getStudentProjectCategories,
        createStudentProjectCategory,
        updateStudentProjectCategory,
        deleteStudentProjectCategory,
        getStudentProjectYears,
        createStudentProjectYear,
        updateStudentProjectYear,
        deleteStudentProjectYear,
        getStudentProjectLocations,
        createStudentProjectLocation,
        updateStudentProjectLocation,
        deleteStudentProjectLocation,
        getStudentProjectUniversities,
        createStudentProjectUniversity,
        updateStudentProjectUniversity,
        deleteStudentProjectUniversity,
        createOffice,
        getAllOffices,
        getOfficeById,
        updateOffice,
        deleteOffice,
        deleteOfficeGalleryImage,
        createAboutUs,
        getAboutUs,
        getAboutUsById,
        updateAboutUs,
        deleteAboutUs,
      }}>
      {children}
    </GlobalContext.Provider>
  )
}

export const useGlobalContext = () => useContext(GlobalContext)
