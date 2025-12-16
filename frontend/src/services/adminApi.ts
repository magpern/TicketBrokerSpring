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
      console.log('Admin API request with auth token:', config.url)
    } else {
      console.warn('Admin API request without auth token:', config.url)
    }
    
    // If sending FormData, remove Content-Type header to let axios set it automatically with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
      console.log('Sending FormData, Content-Type will be set automatically')
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
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Unauthorized or Forbidden - clear auth and redirect to login
      const errorDetails = {
        status: error.response?.status,
        url: error.config?.url,
        hasAuthToken: !!sessionStorage.getItem('adminAuthToken'),
        authHeader: error.config?.headers?.Authorization ? 'present' : 'missing',
        responseData: error.response?.data,
        timestamp: new Date().toISOString()
      }
      
      // Log with multiple methods to ensure it's captured
      console.error('=== AUTHENTICATION FAILED ===')
      console.error('Error details:', errorDetails)
      console.error('Full error object:', error)
      console.error('Request config:', error.config)
      console.error('Response:', error.response)
      console.error('============================')
      
      // Also store in sessionStorage so we can retrieve it after redirect
      try {
        sessionStorage.setItem('lastAuthError', JSON.stringify(errorDetails))
      } catch (e) {
        console.error('Failed to store error in sessionStorage:', e)
      }
      
      sessionStorage.removeItem('adminAuthToken')
      
      // Only redirect if we're not already on the login page
      // Preserve the current page in the redirect so user can return after login
      if (!window.location.pathname.includes('/admin/login')) {
        const currentPath = window.location.pathname + window.location.search
        // Use longer delay to allow console to be read
        setTimeout(() => {
          window.location.href = `/admin/login?redirect=${encodeURIComponent(currentPath)}`
        }, 3000) // 3 seconds to read console
      }
    }
    return Promise.reject(error)
  }
)

export default adminApi

