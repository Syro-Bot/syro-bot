/**
 * API Configuration
 * 
 * Centralized configuration for API endpoints, rate limiting,
 * caching strategies, and request optimization.
 * 
 * @author Syro Frontend Team
 * @version 1.0.0
 */

export const API_CONFIG = {
  // Base URLs - Use environment variables in production
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002',
  
  // Rate Limiting Configuration
  RATE_LIMITS: {
    DEFAULT_RETRY_AFTER: 60000, // 1 minute
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second
    THROTTLE_DELAY: 1000, // 1 second between requests
  },
  
  // Caching Configuration
  CACHE: {
    DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
    STATIC_DATA_TTL: 30 * 60 * 1000, // 30 minutes
    REALTIME_DATA_TTL: 2 * 60 * 1000, // 2 minutes
    USER_DATA_TTL: 10 * 60 * 1000, // 10 minutes
  },
  
  // Request Configuration
  REQUESTS: {
    TIMEOUT: 10000, // 10 seconds
    MAX_CONCURRENT: 3,
    QUEUE_SIZE: 10,
  },
  
  // Endpoint-specific configurations
  ENDPOINTS: {
    // User and authentication
    ME: {
      url: '/me',
      cacheTTL: 10 * 60 * 1000, // 10 minutes
      throttleDelay: 2000, // 2 seconds
      priority: 'high' as const,
    },
    
    // Logs (real-time data)
    LOGS: {
      url: '/api/logs',
      cacheTTL: 2 * 60 * 1000, // 2 minutes
      throttleDelay: 2000, // 2 seconds
      priority: 'high' as const,
      refreshInterval: 15000, // 15 seconds
    },
    
    // Statistics (semi-static data)
    STATS: {
      url: '/api/stats',
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      throttleDelay: 3000, // 3 seconds
      priority: 'normal' as const,
      refreshInterval: 30000, // 30 seconds
    },
    
    // Guild configuration (static data)
    GUILD_CONFIG: {
      url: '/api/guild',
      cacheTTL: 30 * 60 * 1000, // 30 minutes
      throttleDelay: 5000, // 5 seconds
      priority: 'low' as const,
    },
    
    // Auto-moderation (real-time data)
    AUTOMOD: {
      url: '/api/automod',
      cacheTTL: 1 * 60 * 1000, // 1 minute
      throttleDelay: 2000, // 2 seconds
      priority: 'high' as const,
      refreshInterval: 10000, // 10 seconds
    },
    
    // Welcome messages (static data)
    WELCOME: {
      url: '/api/welcome',
      cacheTTL: 15 * 60 * 1000, // 15 minutes
      throttleDelay: 3000, // 3 seconds
      priority: 'normal' as const,
    },
    
    // Channel management (static data)
    CHANNELS: {
      url: '/api/channels',
      cacheTTL: 20 * 60 * 1000, // 20 minutes
      throttleDelay: 4000, // 4 seconds
      priority: 'normal' as const,
    },
  },
  
  // Error handling
  ERRORS: {
    RATE_LIMIT_MESSAGE: 'Rate limited. Please wait before making more requests.',
    NETWORK_ERROR_MESSAGE: 'Network error. Please check your connection.',
    TIMEOUT_MESSAGE: 'Request timeout. Please try again.',
    UNAUTHORIZED_MESSAGE: 'Unauthorized. Please log in again.',
  },
  
  // Performance monitoring
  MONITORING: {
    UPDATE_INTERVAL: 5000, // 5 seconds
    MAX_CACHE_ENTRIES: 100,
    CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
  },
};

/**
 * Get endpoint configuration by key
 */
export function getEndpointConfig(key: keyof typeof API_CONFIG.ENDPOINTS) {
  return API_CONFIG.ENDPOINTS[key];
}

/**
 * Build full URL for an endpoint
 */
export function buildUrl(endpoint: string, params?: Record<string, string>): string {
  const url = new URL(endpoint, API_CONFIG.BASE_URL);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  return url.toString();
}

/**
 * Get appropriate cache TTL based on data type
 */
export function getCacheTTL(dataType: 'static' | 'realtime' | 'user' | 'default' = 'default'): number {
  switch (dataType) {
    case 'static':
      return API_CONFIG.CACHE.STATIC_DATA_TTL;
    case 'realtime':
      return API_CONFIG.CACHE.REALTIME_DATA_TTL;
    case 'user':
      return API_CONFIG.CACHE.USER_DATA_TTL;
    default:
      return API_CONFIG.CACHE.DEFAULT_TTL;
  }
}

export default API_CONFIG; 