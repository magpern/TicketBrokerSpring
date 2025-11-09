import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'

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
  
  // Use refs to avoid stale closures in setInterval
  const isOnlineRef = useRef(false)
  const isCheckingRef = useRef(true)
  const lastCheckedRef = useRef<Date | null>(null)

  const checkBackendHealth = async () => {
    // Don't show loading state for periodic checks - only for initial check
    const isInitialCheck = isCheckingRef.current && lastCheckedRef.current === null
    
    if (isInitialCheck) {
      setIsChecking(true)
      isCheckingRef.current = true
    }
    
    try {
      // Try to reach the health endpoint directly (not via /api prefix)
      // Actuator endpoints are at /actuator/health, not /api/actuator/health
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
      
      const response = await fetch('/actuator/health', {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      })
      
      clearTimeout(timeoutId)
      
      const newIsOnline = response.ok && response.status === 200
      
      // Only update state if status changed to avoid unnecessary re-renders
      if (newIsOnline !== isOnlineRef.current) {
        setIsOnline(newIsOnline)
        isOnlineRef.current = newIsOnline
      }
      
      const now = new Date()
      setLastChecked(now)
      lastCheckedRef.current = now
    } catch (error) {
      // Backend is offline or unreachable
      // Only update state if status changed
      if (isOnlineRef.current) {
        setIsOnline(false)
        isOnlineRef.current = false
      }
      const now = new Date()
      setLastChecked(now)
      lastCheckedRef.current = now
    } finally {
      if (isInitialCheck) {
        setIsChecking(false)
        isCheckingRef.current = false
      }
    }
  }
  
  // Update refs when state changes
  useEffect(() => {
    isOnlineRef.current = isOnline
  }, [isOnline])
  
  useEffect(() => {
    isCheckingRef.current = isChecking
  }, [isChecking])
  
  useEffect(() => {
    lastCheckedRef.current = lastChecked
  }, [lastChecked])

  useEffect(() => {
    // Initial check
    checkBackendHealth()

    // Check every 10 seconds (silently in background)
    const interval = setInterval(checkBackendHealth, 10000)

    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BackendStatusContext.Provider value={{ isOnline, isChecking, lastChecked }}>
      {children}
    </BackendStatusContext.Provider>
  )
}

