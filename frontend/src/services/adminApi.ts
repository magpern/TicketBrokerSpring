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
    const auth = localStorage.getItem('adminAuth')
    if (auth) {
      const { username, password } = JSON.parse(auth)
      // Basic auth header
      config.headers.Authorization = `Basic ${btoa(`${username}:${password}`)}`
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
      localStorage.removeItem('adminAuth')
      window.location.href = '/admin/login'
    }
    return Promise.reject(error)
  }
)

export default adminApi

