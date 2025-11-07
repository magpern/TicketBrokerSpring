import axios from 'axios'

// Create admin API instance with authentication
const adminApi = axios.create({
  baseURL: '/api/admin',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor to include basic auth
adminApi.interceptors.request.use(
  (config) => {
    // Retrieve base64 encoded Basic Auth token from sessionStorage
    const authToken = sessionStorage.getItem('adminAuthToken')
    if (authToken) {
      config.headers.Authorization = `Basic ${authToken}`
    }
    
    // If sending FormData, remove Content-Type header to let axios set it automatically with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor to handle auth errors
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      sessionStorage.removeItem('adminAuthToken')
      window.location.href = '/admin/login'
    }
    return Promise.reject(error)
  }
)

export default adminApi

