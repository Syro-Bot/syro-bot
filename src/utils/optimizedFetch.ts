/**
 * Optimized Fetch Utility
 * 
 * Provides optimized fetch functionality with caching, retry logic,
 * and error handling for better performance and reliability.
 * 
 * @author Syro Frontend Team
 * @version 1.0.0
 */

interface FetchOptions extends RequestInit {
  cache?: 'no-cache' | 'default' | 'force-cache';
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class FetchCache {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  getSize(): number {
    return this.cache.size;
  }
}

const fetchCache = new FetchCache();

/**
 * Create a timeout promise
 */
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
  });
}

/**
 * Optimized fetch with caching, retry logic, and error handling
 */
export async function optimizedFetch<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    cache = 'default',
    retries = 3,
    retryDelay = 1000,
    timeout = 10000,
    ...fetchOptions
  } = options;

  // Check cache first
  if (cache === 'force-cache') {
    const cachedData = fetchCache.get(url);
    if (cachedData) {
      return cachedData;
    }
  }

  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create fetch promise with timeout
      const fetchPromise = fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      });

      const response = await Promise.race([
        fetchPromise,
        createTimeout(timeout)
      ]);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache successful responses
      if (cache !== 'no-cache') {
        fetchCache.set(url, data);
      }

      return data;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === retries) {
        break;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }

  throw lastError!;
}

/**
 * Prefetch data for better UX
 */
export function prefetch(url: string, options?: FetchOptions): void {
  optimizedFetch(url, { ...options, cache: 'force-cache' }).catch(() => {
    // Silently fail for prefetch
  });
}

/**
 * Clear fetch cache
 */
export function clearFetchCache(): void {
  fetchCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number } {
  return { size: fetchCache.getSize() };
}

export default optimizedFetch; 