/**
 * @fileoverview Cooldown Manager - Command Rate Limiting and Cooldown System
 * 
 * Advanced cooldown management system for Discord bot commands.
 * Provides per-user, per-command, and global rate limiting with
 * configurable cooldown periods and intelligent cache management.
 * 
 * Features:
 * - Per-user command cooldowns
 * - Per-command global cooldowns
 * - Configurable cooldown periods
 * - Memory-efficient caching
 * - Cooldown inheritance and overrides
 * - Performance monitoring and statistics
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const { Collection } = require('discord.js');
const logger = require('../../utils/logger');

/**
 * Cooldown Manager Class
 * 
 * Manages command cooldowns, rate limiting, and usage tracking.
 * Provides efficient cooldown checking with memory optimization.
 * 
 * @class CooldownManager
 */
class CooldownManager {
  /**
   * Initialize the Cooldown Manager
   * 
   * @param {Object} options - Configuration options
   * @param {boolean} options.enableCaching - Enable cooldown caching
   * @param {number} options.cacheTTL - Cache time-to-live in milliseconds
   * @param {number} options.maxCooldowns - Maximum cooldowns to track per user
   * @param {boolean} options.enableStatistics - Enable usage statistics
   */
  constructor(options = {}) {
    this.enableCaching = options.enableCaching !== false;
    this.cacheTTL = options.cacheTTL || 300000; // 5 minutes
    this.maxCooldowns = options.maxCooldowns || 1000;
    this.enableStatistics = options.enableStatistics !== false;
    
    // Cooldown storage
    this.userCooldowns = new Collection();
    this.commandCooldowns = new Collection();
    this.globalCooldowns = new Collection();
    
    // Cache system
    this.cooldownCache = new Collection();
    
    // Statistics
    this.stats = {
      totalChecks: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cooldownHits: 0,
      cooldownMisses: 0,
      totalCooldownTime: 0
    };
    
    // Performance tracking
    this.performance = {
      averageCheckTime: 0,
      totalCheckTime: 0,
      checkCount: 0
    };
    
    // Initialize the system
    this._initialize();
  }

  /**
   * Initialize the cooldown manager
   * 
   * @private
   */
  _initialize() {
    try {
      logger.info('⏰ Initializing Cooldown Manager...');
      
      // Setup cache cleanup
      this._setupCacheCleanup();
      
      // Setup memory management
      this._setupMemoryManagement();
      
      logger.info('✅ Cooldown Manager initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Cooldown Manager:', error);
      throw error;
    }
  }

  /**
   * Setup cache cleanup
   * 
   * @private
   */
  _setupCacheCleanup() {
    // Clean up expired cooldowns every minute
    setInterval(() => {
      this._cleanupExpiredCooldowns();
    }, 60000); // 1 minute
    
    // Clear cache periodically
    if (this.enableCaching) {
      setInterval(() => {
        this.cooldownCache.clear();
        logger.debug('🔄 Cooldown cache cleared');
      }, this.cacheTTL);
    }
  }

  /**
   * Setup memory management
   * 
   * @private
   */
  _setupMemoryManagement() {
    // Monitor memory usage and clean up if necessary
    setInterval(() => {
      this._manageMemory();
    }, 300000); // 5 minutes
  }

  /**
   * Check if a user can use a command (cooldown check)
   * 
   * @param {string} userId - User ID
   * @param {string} commandName - Command name
   * @param {number} cooldown - Cooldown time in milliseconds
   * @returns {Promise<Object>} Cooldown check result
   */
  async checkCooldown(userId, commandName, cooldown) {
    const startTime = Date.now();
    
    try {
      this.stats.totalChecks++;
      
      // Generate cache key
      const cacheKey = this._generateCacheKey(userId, commandName);
      
      // Check cache first
      if (this.enableCaching && this.cooldownCache.has(cacheKey)) {
        this.stats.cacheHits++;
        const cachedResult = this.cooldownCache.get(cacheKey);
        
        // Update performance stats
        this._updatePerformanceStats(Date.now() - startTime);
        
        return cachedResult;
      }
      
      this.stats.cacheMisses++;
      
      // Check global cooldown first
      const globalCooldownResult = this._checkGlobalCooldown(commandName);
      if (!globalCooldownResult.allowed) {
        const result = {
          allowed: false,
          remainingTime: globalCooldownResult.remainingTime,
          type: 'global'
        };
        
        // Cache the result
        if (this.enableCaching) {
          this.cooldownCache.set(cacheKey, result);
        }
        
        this.stats.cooldownHits++;
        this._updatePerformanceStats(Date.now() - startTime);
        
        return result;
      }
      
      // Check user-specific cooldown
      const userCooldownResult = this._checkUserCooldown(userId, commandName, cooldown);
      
      // Cache the result
      if (this.enableCaching) {
        this.cooldownCache.set(cacheKey, userCooldownResult);
      }
      
      // Update statistics
      if (userCooldownResult.allowed) {
        this.stats.cooldownMisses++;
      } else {
        this.stats.cooldownHits++;
        this.stats.totalCooldownTime += userCooldownResult.remainingTime;
      }
      
      // Update performance stats
      this._updatePerformanceStats(Date.now() - startTime);
      
      return userCooldownResult;
      
    } catch (error) {
      logger.error('❌ Cooldown check error:', error);
      return {
        allowed: true,
        remainingTime: 0,
        type: 'error'
      };
    }
  }

  /**
   * Set a cooldown for a user and command
   * 
   * @param {string} userId - User ID
   * @param {string} commandName - Command name
   * @param {number} cooldown - Cooldown time in milliseconds
   * @returns {boolean} Success status
   */
  setCooldown(userId, commandName, cooldown) {
    try {
      const now = Date.now();
      const expiresAt = now + cooldown;
      
      // Initialize user cooldowns if not exists
      if (!this.userCooldowns.has(userId)) {
        this.userCooldowns.set(userId, new Collection());
      }
      
      const userCooldowns = this.userCooldowns.get(userId);
      
      // Set the cooldown
      userCooldowns.set(commandName, {
        expiresAt,
        setAt: now,
        duration: cooldown
      });
      
      // Clear cache for this user/command combination
      this._clearUserCache(userId, commandName);
      
      logger.debug(`⏰ Cooldown set: ${userId} -> ${commandName} (${cooldown}ms)`);
      return true;
      
    } catch (error) {
      logger.error('❌ Failed to set cooldown:', error);
      return false;
    }
  }

  /**
   * Set a global cooldown for a command
   * 
   * @param {string} commandName - Command name
   * @param {number} cooldown - Cooldown time in milliseconds
   * @returns {boolean} Success status
   */
  setGlobalCooldown(commandName, cooldown) {
    try {
      const now = Date.now();
      const expiresAt = now + cooldown;
      
      this.globalCooldowns.set(commandName, {
        expiresAt,
        setAt: now,
        duration: cooldown
      });
      
      // Clear all cache entries for this command
      this._clearCommandCache(commandName);
      
      logger.info(`⏰ Global cooldown set: ${commandName} (${cooldown}ms)`);
      return true;
      
    } catch (error) {
      logger.error('❌ Failed to set global cooldown:', error);
      return false;
    }
  }

  /**
   * Remove cooldown for a user and command
   * 
   * @param {string} userId - User ID
   * @param {string} commandName - Command name
   * @returns {boolean} Success status
   */
  removeCooldown(userId, commandName) {
    try {
      const userCooldowns = this.userCooldowns.get(userId);
      if (!userCooldowns) {
        return false;
      }
      
      const removed = userCooldowns.delete(commandName);
      
      if (removed) {
        // Clear cache for this user/command combination
        this._clearUserCache(userId, commandName);
        
        logger.debug(`✅ Cooldown removed: ${userId} -> ${commandName}`);
      }
      
      return removed;
      
    } catch (error) {
      logger.error('❌ Failed to remove cooldown:', error);
      return false;
    }
  }

  /**
   * Get cooldown information for a user and command
   * 
   * @param {string} userId - User ID
   * @param {string} commandName - Command name
   * @returns {Object|null} Cooldown information
   */
  getCooldown(userId, commandName) {
    try {
      const userCooldowns = this.userCooldowns.get(userId);
      if (!userCooldowns) {
        return null;
      }
      
      const cooldown = userCooldowns.get(commandName);
      if (!cooldown) {
        return null;
      }
      
      const now = Date.now();
      const remainingTime = Math.max(0, cooldown.expiresAt - now);
      
      return {
        ...cooldown,
        remainingTime,
        isExpired: remainingTime <= 0
      };
      
    } catch (error) {
      logger.error('❌ Error getting cooldown:', error);
      return null;
    }
  }

  /**
   * Get all cooldowns for a user
   * 
   * @param {string} userId - User ID
   * @returns {Object} User cooldowns
   */
  getUserCooldowns(userId) {
    try {
      const userCooldowns = this.userCooldowns.get(userId);
      if (!userCooldowns) {
        return {};
      }
      
      const cooldowns = {};
      const now = Date.now();
      
      for (const [commandName, cooldown] of userCooldowns) {
        const remainingTime = Math.max(0, cooldown.expiresAt - now);
        
        cooldowns[commandName] = {
          ...cooldown,
          remainingTime,
          isExpired: remainingTime <= 0
        };
      }
      
      return cooldowns;
      
    } catch (error) {
      logger.error(`❌ Error getting user cooldowns for ${userId}:`, error);
      return {};
    }
  }

  /**
   * Get cooldown statistics
   * 
   * @returns {Object} Cooldown statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheHitRate: this.stats.totalChecks > 0 ? 
        (this.stats.cacheHits / this.stats.totalChecks * 100).toFixed(2) : 0,
      cooldownHitRate: this.stats.totalChecks > 0 ? 
        (this.stats.cooldownHits / this.stats.totalChecks * 100).toFixed(2) : 0,
      averageCooldownTime: this.stats.cooldownHits > 0 ? 
        (this.stats.totalCooldownTime / this.stats.cooldownHits).toFixed(2) : 0,
      performance: {
        ...this.performance,
        averageCheckTime: this.performance.averageCheckTime.toFixed(2)
      },
      storage: {
        totalUsers: this.userCooldowns.size,
        totalGlobalCooldowns: this.globalCooldowns.size,
        totalCachedEntries: this.cooldownCache.size
      }
    };
  }

  /**
   * Clear all cooldowns for a user
   * 
   * @param {string} userId - User ID
   * @returns {boolean} Success status
   */
  clearUserCooldowns(userId) {
    try {
      const removed = this.userCooldowns.delete(userId);
      
      if (removed) {
        // Clear all cache entries for this user
        this._clearUserCache(userId);
        
        logger.info(`🗑️ All cooldowns cleared for user: ${userId}`);
      }
      
      return removed;
      
    } catch (error) {
      logger.error('❌ Failed to clear user cooldowns:', error);
      return false;
    }
  }

  /**
   * Clear all cooldowns
   * 
   * @returns {boolean} Success status
   */
  clearAllCooldowns() {
    try {
      this.userCooldowns.clear();
      this.commandCooldowns.clear();
      this.globalCooldowns.clear();
      this.cooldownCache.clear();
      
      logger.info('🗑️ All cooldowns cleared');
      return true;
      
    } catch (error) {
      logger.error('❌ Failed to clear all cooldowns:', error);
      return false;
    }
  }

  /**
   * Check global cooldown for a command
   * 
   * @param {string} commandName - Command name
   * @returns {Object} Global cooldown check result
   * @private
   */
  _checkGlobalCooldown(commandName) {
    const globalCooldown = this.globalCooldowns.get(commandName);
    if (!globalCooldown) {
      return { allowed: true, remainingTime: 0 };
    }
    
    const now = Date.now();
    const remainingTime = Math.max(0, globalCooldown.expiresAt - now);
    
    return {
      allowed: remainingTime <= 0,
      remainingTime,
      type: 'global'
    };
  }

  /**
   * Check user-specific cooldown
   * 
   * @param {string} userId - User ID
   * @param {string} commandName - Command name
   * @param {number} cooldown - Cooldown time in milliseconds
   * @returns {Object} User cooldown check result
   * @private
   */
  _checkUserCooldown(userId, commandName, cooldown) {
    const userCooldowns = this.userCooldowns.get(userId);
    if (!userCooldowns) {
      return { allowed: true, remainingTime: 0, type: 'user' };
    }
    
    const userCooldown = userCooldowns.get(commandName);
    if (!userCooldown) {
      return { allowed: true, remainingTime: 0, type: 'user' };
    }
    
    const now = Date.now();
    const remainingTime = Math.max(0, userCooldown.expiresAt - now);
    
    return {
      allowed: remainingTime <= 0,
      remainingTime,
      type: 'user'
    };
  }

  /**
   * Generate cache key for cooldown check
   * 
   * @param {string} userId - User ID
   * @param {string} commandName - Command name
   * @returns {string} Cache key
   * @private
   */
  _generateCacheKey(userId, commandName) {
    return `${userId}:${commandName}`;
  }

  /**
   * Clear cache for a specific user and command
   * 
   * @param {string} userId - User ID
   * @param {string} commandName - Command name (optional)
   * @private
   */
  _clearUserCache(userId, commandName = null) {
    if (!this.enableCaching) return;
    
    if (commandName) {
      // Clear specific user/command cache
      const cacheKey = this._generateCacheKey(userId, commandName);
      this.cooldownCache.delete(cacheKey);
    } else {
      // Clear all cache entries for this user
      for (const [key] of this.cooldownCache) {
        if (key.startsWith(`${userId}:`)) {
          this.cooldownCache.delete(key);
        }
      }
    }
  }

  /**
   * Clear cache for a specific command
   * 
   * @param {string} commandName - Command name
   * @private
   */
  _clearCommandCache(commandName) {
    if (!this.enableCaching) return;
    
    // Clear all cache entries for this command
    for (const [key] of this.cooldownCache) {
      if (key.includes(`:${commandName}`)) {
        this.cooldownCache.delete(key);
      }
    }
  }

  /**
   * Clean up expired cooldowns
   * 
   * @private
   */
  _cleanupExpiredCooldowns() {
    const now = Date.now();
    let cleanedCount = 0;
    
    // Clean up user cooldowns
    for (const [userId, userCooldowns] of this.userCooldowns) {
      for (const [commandName, cooldown] of userCooldowns) {
        if (cooldown.expiresAt <= now) {
          userCooldowns.delete(commandName);
          cleanedCount++;
        }
      }
      
      // Remove user entry if no cooldowns remain
      if (userCooldowns.size === 0) {
        this.userCooldowns.delete(userId);
      }
    }
    
    // Clean up global cooldowns
    for (const [commandName, cooldown] of this.globalCooldowns) {
      if (cooldown.expiresAt <= now) {
        this.globalCooldowns.delete(commandName);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.debug(`🧹 Cleaned up ${cleanedCount} expired cooldowns`);
    }
  }

  /**
   * Manage memory usage
   * 
   * @private
   */
  _manageMemory() {
    // If we have too many users, remove the oldest ones
    if (this.userCooldowns.size > this.maxCooldowns) {
      const entriesToRemove = this.userCooldowns.size - this.maxCooldowns;
      const oldestUsers = Array.from(this.userCooldowns.entries())
        .sort(([, a], [, b]) => {
          const aOldest = Math.min(...Array.from(a.values()).map(c => c.setAt));
          const bOldest = Math.min(...Array.from(b.values()).map(c => c.setAt));
          return aOldest - bOldest;
        })
        .slice(0, entriesToRemove);
      
      for (const [userId] of oldestUsers) {
        this.userCooldowns.delete(userId);
      }
      
      logger.info(`🧹 Removed ${entriesToRemove} old user cooldown entries`);
    }
  }

  /**
   * Update performance statistics
   * 
   * @param {number} checkTime - Check time in milliseconds
   * @private
   */
  _updatePerformanceStats(checkTime) {
    this.performance.checkCount++;
    this.performance.totalCheckTime += checkTime;
    this.performance.averageCheckTime = 
      this.performance.totalCheckTime / this.performance.checkCount;
  }
}

module.exports = CooldownManager; 