/**
 * useSmartAPI Hook - Intelligent API Management
 * 
 * A smarter approach to API requests that minimizes unnecessary calls
 * and provides better caching strategies.
 * 
 * @author Syro Frontend Team
 * @version 2.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import apiManager from '../utils/apiManager';

interface UseSmartAPIOptions {
  url: string;
  enabled?: boolean;
  cacheTTL?: number;
  retryAttempts?: number;
  retryDelay?: number;
  priority?: 'low' | 'normal' | 'high';
  throttleDelay?: number;
  // Smart refresh options
  smartRefresh?: boolean; // Only refresh when tab becomes visible
  refreshOnFocus?: boolean; // Refresh when window gains focus
  refreshOnVisibilityChange?: boolean; // Refresh when tab becomes visible
  maxRefreshInterval?: number; // Maximum time between refreshes
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface UseSmartAPIResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
  lastUpdated: Date | null;
}

export function useSmartAPI<T = any>(options: UseSmartAPIOptions): UseSmartAPIResult<T> {
  const {
    url,
    enabled = true,
    cacheTTL = 10 * 60 * 1000, // 10 minutes default
    retryAttempts = 2,
    retryDelay = 1000,
    priority = 'normal',
    throttleDelay = 3000,
    smartRefresh = true,
    refreshOnFocus = true,
    refreshOnVisibilityChange = true,
    maxRefreshInterval = 5 * 60 * 1000, // 5 minutes max
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (force = false) => {
    if (!enabled || !url) return;

    const now = Date.now();
    
    // Don't fetch if rate limited
    if (isRateLimited && !force) {
      console.log('⏱️ Skipping fetch - rate limited');
      return;
    }

    // Don't fetch too frequently (but allow initial load)
    if (!force && data && now - lastFetchRef.current < throttleDelay) {
      console.log('⏱️ Skipping fetch - too soon');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      lastFetchRef.current = now;

      const result = await apiManager.request<T>({
        url,
        options: {
          signal: abortControllerRef.current.signal,
          credentials: 'include'
        },
        cacheTTL,
        retryAttempts,
        retryDelay,
        priority,
        throttleDelay
      });

      setData(result);
      setLastUpdated(new Date());
      setIsRateLimited(false);
      onSuccess?.(result);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      onError?.(error);
      
      // Handle rate limiting
      if (error.message.includes('Rate limited')) {
        console.warn('Rate limited, pausing for 2 minutes');
        setIsRateLimited(true);
        setTimeout(() => setIsRateLimited(false), 2 * 60 * 1000);
      }
    } finally {
      setLoading(false);
    }
  }, [url, enabled, cacheTTL, retryAttempts, retryDelay, priority, throttleDelay, isRateLimited, onSuccess, onError]);

  const refetch = useCallback(async () => {
    apiManager.clearCache(url);
    await fetchData(true);
  }, [fetchData, url]);

  const clearCache = useCallback(() => {
    apiManager.clearCache(url);
  }, [url]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, url]);

  // Smart refresh based on visibility and focus
  useEffect(() => {
    if (!enabled || !smartRefresh) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && refreshOnVisibilityChange) {
        const now = Date.now();
        if (now - lastFetchRef.current > maxRefreshInterval) {
          console.log('🔄 Tab became visible, refreshing data');
          fetchData();
        }
      }
    };

    const handleFocus = () => {
      if (refreshOnFocus) {
        const now = Date.now();
        if (now - lastFetchRef.current > maxRefreshInterval) {
          console.log('🔄 Window gained focus, refreshing data');
          fetchData();
        }
      }
    };

    // Periodic refresh (less frequent)
    if (smartRefresh) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        if (now - lastFetchRef.current > maxRefreshInterval && !isRateLimited) {
          console.log('🔄 Periodic refresh');
          fetchData();
        }
      }, maxRefreshInterval);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, smartRefresh, refreshOnVisibilityChange, refreshOnFocus, maxRefreshInterval, fetchData, isRateLimited]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache,
    lastUpdated
  };
}

/**
 * Hook for dashboard data that loads once and caches well
 */
export function useDashboardAPI<T = any>(options: UseSmartAPIOptions): UseSmartAPIResult<T> {
  const {
    cacheTTL = 10 * 60 * 1000, // 10 minutes for dashboard data
    maxRefreshInterval = 5 * 60 * 1000, // 5 minutes max
    throttleDelay = 3000, // 3 seconds between requests
    ...restOptions
  } = options;

  return useSmartAPI<T>({
    ...restOptions,
    cacheTTL,
    maxRefreshInterval,
    throttleDelay,
    smartRefresh: true,
    refreshOnFocus: true,
    refreshOnVisibilityChange: true
  });
}

/**
 * Hook for real-time data with minimal refresh
 */
export function useMinimalRealtimeAPI<T = any>(options: UseSmartAPIOptions): UseSmartAPIResult<T> {
  const {
    cacheTTL = 1 * 60 * 1000, // 1 minute for real-time data
    maxRefreshInterval = 30 * 1000, // 30 seconds max for real-time
    throttleDelay = 2000, // 2 seconds between requests
    ...restOptions
  } = options;

  return useSmartAPI<T>({
    ...restOptions,
    cacheTTL,
    maxRefreshInterval,
    throttleDelay,
    smartRefresh: true,
    refreshOnFocus: false,
    refreshOnVisibilityChange: true
  });
} 