/**
 * useOptimizedAPI Hook
 * 
 * Custom hook for optimized API requests with intelligent caching,
 * rate limiting, and automatic retry logic.
 * 
 * @author Syro Frontend Team
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import apiManager from '../utils/apiManager';

interface UseOptimizedAPIOptions {
  url: string;
  enabled?: boolean;
  cacheTTL?: number;
  retryAttempts?: number;
  retryDelay?: number;
  priority?: 'low' | 'normal' | 'high';
  throttleDelay?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface UseOptimizedAPIResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
}

export function useOptimizedAPI<T = any>(options: UseOptimizedAPIOptions): UseOptimizedAPIResult<T> {
  const {
    url,
    enabled = true,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    retryAttempts = 2,
    retryDelay = 1000,
    priority = 'normal',
    throttleDelay = 1000,
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  
  const intervalRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !url) return;

    setLoading(true);
    setError(null);

    try {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

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
      onSuccess?.(result);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, don't set error
        return;
      }
      
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      onError?.(error);
      
      // If rate limited, pause auto-refresh
      if (error.message.includes('Rate limited')) {
        console.warn('Rate limited, pausing auto-refresh for 2 minutes');
        setIsRateLimited(true);
        
        // Resume after 2 minutes
        setTimeout(() => {
          setIsRateLimited(false);
          setError(null);
        }, 2 * 60 * 1000);
        
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [url, enabled, cacheTTL, retryAttempts, retryDelay, priority, throttleDelay, onSuccess, onError]);

  const refetch = useCallback(async () => {
    // Clear cache for this URL before refetching
    apiManager.clearCache(url);
    await fetchData();
  }, [fetchData, url]);

  const clearCache = useCallback(() => {
    apiManager.clearCache(url);
  }, [url]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [fetchData, enabled]);

  // Auto refresh
  useEffect(() => {
    if (autoRefresh && enabled && !isRateLimited) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, enabled, isRateLimited, fetchData, refreshInterval]);

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
    clearCache
  };
}

/**
 * Hook for real-time data with WebSocket-like behavior
 */
export function useRealtimeAPI<T = any>(options: UseOptimizedAPIOptions): UseOptimizedAPIResult<T> {
  const {
    refreshInterval = 30000, // 30 seconds for real-time data (increased)
    ...restOptions
  } = options;

  return useOptimizedAPI<T>({
    ...restOptions,
    autoRefresh: true,
    refreshInterval,
    priority: 'high'
  });
}

/**
 * Hook for static data that doesn't change often
 */
export function useStaticAPI<T = any>(options: UseOptimizedAPIOptions): UseOptimizedAPIResult<T> {
  const {
    cacheTTL = 30 * 60 * 1000, // 30 minutes for static data
    ...restOptions
  } = options;

  return useOptimizedAPI<T>({
    ...restOptions,
    cacheTTL,
    autoRefresh: false,
    priority: 'low'
  });
} 