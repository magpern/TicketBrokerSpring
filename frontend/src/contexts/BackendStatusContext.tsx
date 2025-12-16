import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface BackendStatusContextType {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
}

const BackendStatusContext = createContext<BackendStatusContextType>({
  isOnline: false,
  isChecking: true,
  lastChecked: null,
});

export const useBackendStatus = () => useContext(BackendStatusContext);

interface BackendStatusProviderProps {
  children: ReactNode;
}

export function BackendStatusProvider({
  children,
}: BackendStatusProviderProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Use refs to avoid stale closures in setInterval
  const isOnlineRef = useRef(false);
  const isCheckingRef = useRef(true);
  const lastCheckedRef = useRef<Date | null>(null);
  const consecutiveFailuresRef = useRef(0);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Industry standard: require 2 consecutive failures before marking offline
  const FAILURE_THRESHOLD = 2;
  // Industry standard intervals: 30s when online, exponential backoff when offline
  const HEALTH_CHECK_INTERVAL_ONLINE = 30000; // 30 seconds
  const HEALTH_CHECK_INTERVAL_OFFLINE_BASE = 30000; // Start at 30s
  const HEALTH_CHECK_INTERVAL_OFFLINE_MAX = 300000; // Max 5 minutes
  const HEALTH_CHECK_TIMEOUT = 5000; // 5 second timeout

  const scheduleNextCheck = (isCurrentlyOnline: boolean) => {
    // Clear any existing scheduled check
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    let delay: number;
    if (isCurrentlyOnline) {
      // When online, use standard interval
      delay = HEALTH_CHECK_INTERVAL_ONLINE;
    } else {
      // When offline, use exponential backoff
      const backoffMultiplier = Math.min(
        Math.pow(2, consecutiveFailuresRef.current - FAILURE_THRESHOLD),
        10 // Cap at 10x (5 minutes max)
      );
      delay = Math.min(
        HEALTH_CHECK_INTERVAL_OFFLINE_BASE * backoffMultiplier,
        HEALTH_CHECK_INTERVAL_OFFLINE_MAX
      );
    }

    checkTimeoutRef.current = setTimeout(() => {
      checkBackendHealth();
    }, delay);
  };

  const checkBackendHealth = async () => {
    // Don't show loading state for periodic checks - only for initial check
    const isInitialCheck =
      isCheckingRef.current && lastCheckedRef.current === null;

    if (isInitialCheck) {
      setIsChecking(true);
      isCheckingRef.current = true;
    }

    try {
      // Try to reach the health endpoint directly (not via /api prefix)
      // Actuator endpoints are at /actuator/health, not /api/actuator/health
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        HEALTH_CHECK_TIMEOUT
      );

      const response = await fetch("/actuator/health", {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeoutId);

      const newIsOnline = response.ok && response.status === 200;

      if (newIsOnline) {
        // Success: reset failure count
        consecutiveFailuresRef.current = 0;

        // Only update state if status changed
        if (!isOnlineRef.current) {
          setIsOnline(true);
          isOnlineRef.current = true;
        }

        // Schedule next check with normal interval
        scheduleNextCheck(true);
      } else {
        // Health check returned non-200
        consecutiveFailuresRef.current++;

        // Only mark offline after threshold failures
        if (
          consecutiveFailuresRef.current >= FAILURE_THRESHOLD &&
          isOnlineRef.current
        ) {
          setIsOnline(false);
          isOnlineRef.current = false;
        }

        // Schedule next check with backoff (we're having issues)
        scheduleNextCheck(false);
      }

      const now = new Date();
      setLastChecked(now);
      lastCheckedRef.current = now;
    } catch {
      // Backend is offline or unreachable
      consecutiveFailuresRef.current++;

      // Only mark offline after threshold failures
      if (consecutiveFailuresRef.current >= FAILURE_THRESHOLD) {
        if (isOnlineRef.current) {
          setIsOnline(false);
          isOnlineRef.current = false;
        }
      }

      const now = new Date();
      setLastChecked(now);
      lastCheckedRef.current = now;

      // Schedule next check with exponential backoff
      scheduleNextCheck(false);
    } finally {
      if (isInitialCheck) {
        setIsChecking(false);
        isCheckingRef.current = false;
      }
    }
  };

  // Update refs when state changes
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    isCheckingRef.current = isChecking;
  }, [isChecking]);

  useEffect(() => {
    lastCheckedRef.current = lastChecked;
  }, [lastChecked]);

  useEffect(() => {
    // Initial check
    checkBackendHealth();

    return () => {
      // Cleanup: clear any scheduled checks
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BackendStatusContext.Provider
      value={{ isOnline, isChecking, lastChecked }}
    >
      {children}
    </BackendStatusContext.Provider>
  );
}
