/**
 * Redis Configuration Module
 * 
 * Handles Redis connection for caching, session storage, and performance optimization
 * for the Syro Discord bot API server.
 * 
 * @author Syro Development Team
 * @version 2.0.0
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');

/**
 * Redis Configuration Options
 * Optimized for performance and reliability
 */
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxLoadingTimeout: 10000
};

/**
 * Create Redis client instance
 * @returns {Redis} Redis client
 */
function createRedisClient() {
  try {
    const redis = new Redis(REDIS_CONFIG);
    
    redis.on('connect', () => {
      logger.database('Redis connected successfully');
    });
    
    redis.on('ready', () => {
      logger.database('Redis ready for commands');
    });
    
    redis.on('error', (error) => {
      logger.errorWithContext(error, { context: 'Redis connection error' });
    });
    
    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });
    
    redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
    
    return redis;
  } catch (error) {
    logger.errorWithContext(error, { context: 'Redis client creation' });
    throw error;
  }
}

/**
 * Cache utility functions
 */
class CacheManager {
  constructor() {
    this.redis = createRedisClient();
    this.defaultTTL = 300; // 5 minutes
  }
  
  /**
   * Set cache value
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const serializedValue = JSON.stringify(value);
      await this.redis.setex(key, ttl, serializedValue);
      logger.cache('Cache set', { key, ttl });
    } catch (error) {
      logger.errorWithContext(error, { context: 'Cache set', key });
    }
  }
  
  /**
   * Get cache value
   * @param {string} key - Cache key
   * @returns {any} Cached value or null
   */
  async get(key) {
    try {
      const value = await this.redis.get(key);
      if (value) {
        const parsedValue = JSON.parse(value);
        logger.cache('Cache hit', { key });
        return parsedValue;
      }
      logger.cache('Cache miss', { key });
      return null;
    } catch (error) {
      logger.errorWithContext(error, { context: 'Cache get', key });
      return null;
    }
  }
  
  /**
   * Delete cache key
   * @param {string} key - Cache key
   */
  async del(key) {
    try {
      await this.redis.del(key);
      logger.cache('Cache deleted', { key });
    } catch (error) {
      logger.errorWithContext(error, { context: 'Cache delete', key });
    }
  }
  
  /**
   * Clear all cache
   */
  async clear() {
    try {
      await this.redis.flushdb();
      logger.cache('Cache cleared');
    } catch (error) {
      logger.errorWithContext(error, { context: 'Cache clear' });
    }
  }
  
  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  async getStats() {
    try {
      const info = await this.redis.info();
      const keys = await this.redis.dbsize();
      return { info, keys };
    } catch (error) {
      logger.errorWithContext(error, { context: 'Cache stats' });
      return { info: null, keys: 0 };
    }
  }
}

/**
 * Rate limiting with Redis
 */
class RateLimiter {
  constructor() {
    this.redis = createRedisClient();
  }
  
  /**
   * Check rate limit
   * @param {string} key - Rate limit key (IP or user ID)
   * @param {number} maxRequests - Maximum requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Object} Rate limit status
   */
  async checkRateLimit(key, maxRequests, windowMs) {
    try {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Remove old entries
      await this.redis.zremrangebyscore(key, 0, windowStart);
      
      // Count current requests
      const currentRequests = await this.redis.zcard(key);
      
      if (currentRequests >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: windowStart + windowMs
        };
      }
      
      // Add current request
      await this.redis.zadd(key, now, now.toString());
      await this.redis.expire(key, Math.ceil(windowMs / 1000));
      
      return {
        allowed: true,
        remaining: maxRequests - currentRequests - 1,
        resetTime: windowStart + windowMs
      };
    } catch (error) {
      logger.errorWithContext(error, { context: 'Rate limit check', key });
      return { allowed: true, remaining: 1, resetTime: Date.now() + 60000 };
    }
  }
}

// Create instances
const cacheManager = new CacheManager();
const rateLimiter = new RateLimiter();

module.exports = {
  createRedisClient,
  cacheManager,
  rateLimiter
}; 