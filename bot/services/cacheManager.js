/**
 * Cache Management Service
 * Handles all caching operations with memory protection and automatic cleanup
 */

const { CACHE_SIZE_LIMITS, CACHE_CLEANUP_INTERVALS, CONFIG_CACHE_TTL } = require('../config/constants');

/**
 * In-Memory Cache System with Memory Protection
 * Stores temporary data for automoderation and raid detection
 * All caches are cleared automatically based on time windows and size limits
 */
const recentMessages = new Map();    // Tracks recent messages per user for spam detection
const recentJoins = new Map();       // Tracks recent member joins for raid detection
const recentChannels = new Map();    // Tracks recent channel creation for raid detection
const recentRoles = new Map();       // Tracks recent role creation for raid detection
const serverLockdowns = new Map();   // Tracks servers currently in lockdown
const raidChannels = new Map();      // Tracks channels created during raids for cleanup

// Server configuration cache to reduce database queries
const serverConfigCache = new Map();

// Rate limiting for administrative commands
const commandCooldowns = new Map();

// Debouncing for raid detection to prevent multiple triggers
const raidDetectionDebounce = new Map();

/**
 * Enhanced Cache Cleanup Utility with Size Limits
 * 
 * Removes old entries from cache maps based on time windows and size limits.
 * This prevents memory leaks and ensures accurate automoderation.
 * 
 * @param {Map} cache - The cache map to clean (recentMessages, recentJoins, etc.)
 * @param {number} timeWindow - Time window in seconds for keeping entries
 * @param {string} cacheName - Name of the cache for size limiting
 */
function cleanupCache(cache, timeWindow, cacheName = 'unknown') {
  const now = Date.now();
  const sizeLimit = CACHE_SIZE_LIMITS[cacheName] || 1000;
  
  // If cache is over size limit, remove oldest entries first
  if (cache.size > sizeLimit) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => {
      const aOldest = Math.min(...a[1].map(entry => entry.timestamp));
      const bOldest = Math.min(...b[1].map(entry => entry.timestamp));
      return aOldest - bOldest;
    });
    
    // Remove oldest entries until we're under the limit
    const toRemove = entries.slice(0, cache.size - sizeLimit);
    toRemove.forEach(([key]) => cache.delete(key));
    
    console.log(`🧹 Cache ${cacheName} size reduced from ${entries.length} to ${cache.size} entries`);
  }
  
  // Remove old entries based on time window
  for (const [key, entries] of cache.entries()) {
    const filteredEntries = entries.filter(entry => now - entry.timestamp < timeWindow * 1000);
    if (filteredEntries.length === 0) {
      cache.delete(key);
    } else {
      cache.set(key, filteredEntries);
    }
  }
}

/**
 * Setup automatic cache cleanup intervals
 */
function setupCacheCleanup() {
  // Cleanup recentMessages every 5 minutes
  setInterval(() => {
    cleanupCache(recentMessages, 300, 'recentMessages'); // 5 minutes
  }, CACHE_CLEANUP_INTERVALS.recentMessages);
  
  // Cleanup recentJoins every 10 minutes
  setInterval(() => {
    cleanupCache(recentJoins, 600, 'recentJoins'); // 10 minutes
  }, CACHE_CLEANUP_INTERVALS.recentJoins);
  
  // Cleanup recentChannels every 15 minutes
  setInterval(() => {
    cleanupCache(recentChannels, 900, 'recentChannels'); // 15 minutes
  }, CACHE_CLEANUP_INTERVALS.recentChannels);
  
  // Cleanup recentRoles every 15 minutes
  setInterval(() => {
    cleanupCache(recentRoles, 900, 'recentRoles'); // 15 minutes
  }, CACHE_CLEANUP_INTERVALS.recentRoles);
  
  // Cleanup raidChannels every 30 minutes
  setInterval(() => {
    cleanupCache(raidChannels, 1800, 'raidChannels'); // 30 minutes
  }, CACHE_CLEANUP_INTERVALS.raidChannels);
  
  console.log('🧹 Cache cleanup intervals configured');
}

/**
 * Setup server config cache cleanup
 */
function setupConfigCacheCleanup() {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of serverConfigCache.entries()) {
      if (now - value.timestamp > CONFIG_CACHE_TTL) {
        serverConfigCache.delete(key);
      }
    }
  }, CONFIG_CACHE_TTL);
  
  console.log('⚙️ Server config cache cleanup configured');
}

/**
 * Get server configuration with caching
 * @param {string} serverId - Discord server ID
 * @returns {Promise<Object>} - Server configuration
 */
async function getServerConfig(serverId) {
  const cacheKey = serverId;
  const cached = serverConfigCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CONFIG_CACHE_TTL) {
    return cached.config;
  }
  
  try {
    const ServerConfig = require('../models/ServerConfig');
    const config = await ServerConfig.findOne({ serverId });
    serverConfigCache.set(cacheKey, {
      config: config || null,
      timestamp: Date.now()
    });
    
    return config;
  } catch (error) {
    console.error(`Error fetching server config for ${serverId}:`, error);
    return null;
  }
}

/**
 * Clear server configuration cache
 * @param {string} serverId - Discord server ID (optional, clears all if not provided)
 */
function clearServerConfigCache(serverId = null) {
  if (serverId) {
    serverConfigCache.delete(serverId);
  } else {
    serverConfigCache.clear();
  }
}

/**
 * Check if user is on cooldown for a command
 * @param {string} userId - Discord user ID
 * @param {string} command - Command name
 * @returns {boolean} - True if user is on cooldown
 */
function isOnCooldown(userId, command) {
  const { COMMAND_COOLDOWNS } = require('../config/constants');
  const key = `${userId}-${command}`;
  const cooldown = COMMAND_COOLDOWNS[command];
  
  if (!cooldown) return false;
  
  const lastUsed = commandCooldowns.get(key);
  if (!lastUsed) return false;
  
  const timeLeft = cooldown - (Date.now() - lastUsed);
  return timeLeft > 0;
}

/**
 * Set cooldown for a command
 * @param {string} userId - Discord user ID
 * @param {string} command - Command name
 */
function setCooldown(userId, command) {
  const { COMMAND_COOLDOWNS } = require('../config/constants');
  const key = `${userId}-${command}`;
  commandCooldowns.set(key, Date.now());
  
  // Clean up old cooldowns
  setTimeout(() => {
    commandCooldowns.delete(key);
  }, COMMAND_COOLDOWNS[command] || 60000);
}

/**
 * Debounced raid detection to prevent multiple triggers
 * @param {string} guildId - Discord guild ID
 * @param {string} raidType - Type of raid
 * @param {Function} callback - Function to execute after debounce
 */
function debouncedRaidDetection(guildId, raidType, callback) {
  const { RAID_DEBOUNCE_DELAY } = require('../config/constants');
  const key = `${guildId}-${raidType}`;
  
  if (raidDetectionDebounce.has(key)) {
    clearTimeout(raidDetectionDebounce.get(key));
  }
  
  const timeoutId = setTimeout(() => {
    raidDetectionDebounce.delete(key);
    callback();
  }, RAID_DEBOUNCE_DELAY);
  
  raidDetectionDebounce.set(key, timeoutId);
}

module.exports = {
  // Cache maps
  recentMessages,
  recentJoins,
  recentChannels,
  recentRoles,
  serverLockdowns,
  raidChannels,
  serverConfigCache,
  commandCooldowns,
  raidDetectionDebounce,
  
  // Functions
  cleanupCache,
  setupCacheCleanup,
  setupConfigCacheCleanup,
  getServerConfig,
  clearServerConfigCache,
  isOnCooldown,
  setCooldown,
  debouncedRaidDetection
}; 