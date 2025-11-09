import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import api from '../services/api'

interface BackendStatusContextType {
  isOnline: boolean
  isChecking: boolean
  lastChecked: Date | null
}

const BackendStatusContext = createContext<BackendStatusContextType>({
  isOnline: false,
  isChecking: true,
  lastChecked: null,
})

export const useBackendStatus = () => useContext(BackendStatusContext)

interface BackendStatusProviderProps {
  children: ReactNode
}

export function BackendStatusProvider({ children }: BackendStatusProviderProps) {
  const [isOnline, setIsOnline] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkBackendHealth = async () => {
    setIsChecking(true)
    try {
      // Try to reach the health endpoint (no auth required)
      const response = await api.get('/actuator/health', {
        timeout: 3000, // 3 second timeout
        validateStatus: (status) => status === 200, // Only 200 is success
      })
      
      if (response.status === 200) {
        setIsOnline(true)
        setLastChecked(new Date())
      } else {
        setIsOnline(false)
      }
    } catch (error) {
      // Backend is offline or unreachable
      setIsOnline(false)
      setLastChecked(new Date())
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    // Initial check
    checkBackendHealth()

    // Check every 10 seconds
    const interval = setInterval(checkBackendHealth, 10000)

    return () => clearInterval(interval)
  }, [])

  return (
    <BackendStatusContext.Provider value={{ isOnline, isChecking, lastChecked }}>
      {children}
    </BackendStatusContext.Provider>
  )
}

