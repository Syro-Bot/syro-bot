/**
 * API Manager - Professional Request Management
 * 
 * Handles API requests with intelligent caching, rate limiting,
 * request queuing, and automatic retry logic.
 * 
 * @author Syro Frontend Team
 * @version 2.0.0
 */

interface RequestConfig {
  url: string;
  options?: RequestInit;
  cacheTTL?: number; // Time to live in milliseconds
  retryAttempts?: number;
  retryDelay?: number;
  priority?: 'low' | 'normal' | 'high';
  throttleDelay?: number; // Minimum delay between requests
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  etag?: string;
}

interface RateLimitInfo {
  remaining: number;
  reset: number;
  retryAfter?: number;
}

class APIManager {
  private cache = new Map<string, CacheEntry>();
  private requestQueue: Array<{ config: RequestConfig; resolve: (value: any) => void; reject: (reason: any) => void }> = [];
  private isProcessing = false;
  private rateLimits = new Map<string, RateLimitInfo>();
  private lastRequestTime = new Map<string, number>();
  private defaultThrottleDelay = 1000; // 1 second between requests
  private maxConcurrentRequests = 3;
  private activeRequests = 0;

  constructor() {
    // Clean expired cache entries every 5 minutes
    setInterval(() => this.cleanExpiredCache(), 5 * 60 * 1000);
    
    // Clean expired rate limits every minute
    setInterval(() => this.cleanExpiredRateLimits(), 60 * 1000);
  }

  /**
   * Make an API request with intelligent caching and rate limiting
   */
  async request<T = any>(config: RequestConfig): Promise<T> {
    const {
      url,
      cacheTTL = 5 * 60 * 1000, // 5 minutes default
      retryAttempts = 2,
      retryDelay = 1000,
      priority = 'normal',
      throttleDelay = this.defaultThrottleDelay
    } = config;

    // Check cache first
    const cached = this.getCachedData(url);
    if (cached) {
      return cached;
    }

    // Check rate limits - if rate limited, throw immediately
    if (this.isRateLimited(url)) {
      const retryAfter = this.getRetryAfter(url);
      throw new Error(`Rate limited. Retry after ${retryAfter}ms`);
    }

    // Throttle requests
    await this.throttleRequest(url, throttleDelay);

    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        config: { ...config, cacheTTL, retryAttempts, retryDelay, priority, throttleDelay },
        resolve,
        reject
      });

      this.processQueue();
    });
  }

  /**
   * Process the request queue with priority handling
   */
  private async processQueue() {
    if (this.isProcessing || this.activeRequests >= this.maxConcurrentRequests) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      // Sort by priority
      this.requestQueue.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        return priorityOrder[b.config.priority!] - priorityOrder[a.config.priority!];
      });

      const { config, resolve, reject } = this.requestQueue.shift()!;
      this.activeRequests++;

      this.executeRequest(config)
        .then(resolve)
        .catch(reject)
        .finally(() => {
          this.activeRequests--;
          this.processQueue();
        });
    }

    this.isProcessing = false;
  }

  /**
   * Execute a single request with retry logic
   */
  private async executeRequest<T>(config: RequestConfig): Promise<T> {
    const { url, options = {}, cacheTTL, retryAttempts = 2, retryDelay = 1000 } = config;
    let lastError: Error;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = this.parseRetryAfter(response);
          this.updateRateLimit(url, retryAfter);
          throw new Error(`Rate limited. Retry after ${retryAfter}ms`);
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Cache successful responses
        this.cacheData(url, data, cacheTTL || 5 * 60 * 1000, response.headers.get('etag'));

        return data;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === retryAttempts) {
          break;
        }

        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }

    throw lastError!;
  }

  /**
   * Get cached data if available and not expired
   */
  private getCachedData(url: string): any | null {
    const entry = this.cache.get(url);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(url);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache data with TTL
   */
  private cacheData(url: string, data: any, ttl: number, etag?: string | null): void {
    this.cache.set(url, {
      data,
      timestamp: Date.now(),
      ttl,
      etag: etag || undefined
    });
  }

  /**
   * Check if a URL is rate limited
   */
  private isRateLimited(url: string): boolean {
    const rateLimit = this.rateLimits.get(url);
    if (!rateLimit) return false;

    return rateLimit.remaining <= 0 && Date.now() < rateLimit.reset;
  }

  /**
   * Get retry after time for rate limited requests
   */
  private getRetryAfter(url: string): number {
    const rateLimit = this.rateLimits.get(url);
    if (!rateLimit) return 0;

    return Math.max(0, rateLimit.reset - Date.now());
  }

  /**
   * Update rate limit information
   */
  private updateRateLimit(url: string, retryAfter: number): void {
    this.rateLimits.set(url, {
      remaining: 0,
      reset: Date.now() + retryAfter,
      retryAfter
    });
  }

  /**
   * Parse retry-after header
   */
  private parseRetryAfter(response: Response): number {
    const retryAfter = response.headers.get('retry-after');
    if (!retryAfter) return 60000; // Default 1 minute

    const seconds = parseInt(retryAfter, 10);
    // Cap the retry time to a maximum of 5 minutes to prevent infinite loops
    const retryTime = isNaN(seconds) ? 60000 : Math.min(seconds * 1000, 5 * 60 * 1000);
    return retryTime;
  }

  /**
   * Throttle requests to prevent overwhelming the server
   */
  private async throttleRequest(url: string, delay: number): Promise<void> {
    const lastRequest = this.lastRequestTime.get(url) || 0;
    const timeSinceLastRequest = Date.now() - lastRequest;
    
    if (timeSinceLastRequest < delay) {
      await new Promise(resolve => setTimeout(resolve, delay - timeSinceLastRequest));
    }
    
    this.lastRequestTime.set(url, Date.now());
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clean expired rate limits
   */
  private cleanExpiredRateLimits(): void {
    const now = Date.now();
    for (const [url, rateLimit] of this.rateLimits.entries()) {
      if (now >= rateLimit.reset) {
        this.rateLimits.delete(url);
      }
    }
  }

  /**
   * Clear cache for specific URL or all cache
   */
  clearCache(url?: string): void {
    if (url) {
      this.cache.delete(url);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ key: string; age: number; ttl: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): { queueLength: number; activeRequests: number; isProcessing: boolean; maxConcurrentRequests: number } {
    return {
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests,
      isProcessing: this.isProcessing,
      maxConcurrentRequests: this.maxConcurrentRequests
    };
  }
}

// Create singleton instance
const apiManager = new APIManager();

export default apiManager; 