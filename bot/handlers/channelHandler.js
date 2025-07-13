/**
 * Channel Handler
 * Handles channel creation and deletion events for raid detection
 */

const cacheManager = require('../services/cacheManager');
const LogManager = require('../utils/logManager');
const { handleError } = require('../utils/errorHandler');

/**
 * Handle channel creation event
 * @param {Channel} channel - Discord channel object
 */
async function handleChannelCreate(channel) {
  try {
    console.log(`📝 Channel created: ${channel.name} in ${channel.guild.name}`);
    
    // Get server configuration
    const config = await cacheManager.getServerConfig(channel.guild.id);
    if (!config || !config.automodRules?.Raids) return;
    
    const raidRules = config.automodRules.Raids.filter(rule => rule.raidType === 'channel');
    if (raidRules.length === 0) return;
    
    const rule = raidRules[0];
    const key = channel.guild.id;
    
    if (!cacheManager.recentChannels.has(key)) {
      cacheManager.recentChannels.set(key, []);
    }
    
    const guildChannels = cacheManager.recentChannels.get(key);
    guildChannels.push({ timestamp: Date.now(), channelId: channel.id });
    
    // Track channel for potential cleanup
    if (!cacheManager.raidChannels.has(key)) {
      cacheManager.raidChannels.set(key, []);
    }
    cacheManager.raidChannels.get(key).push(channel.id);
    
    // Clean up old channels
    cacheManager.cleanupCache(cacheManager.recentChannels, rule.timeWindow, 'recentChannels');
    
    // Check if limit is exceeded
    if (guildChannels.length >= rule.channelCount) {
      // Log raid detection
      await LogManager.logRaidDetected(channel.guild.id, 'channel', {
        count: guildChannels.length,
        threshold: rule.channelCount,
        timeWindow: rule.timeWindow,
        lockdownDuration: rule.lockdownDuration
      });
      
      // Apply lockdown using debouncing
      cacheManager.debouncedRaidDetection(channel.guild.id, 'channel', () => {
        const lockdownService = require('../services/lockdownService');
        lockdownService.applyLockdown(channel.guild, rule.lockdownDuration, 'channel');
      });
      
      // Clear cache for this guild
      cacheManager.recentChannels.delete(key);
    }
    
  } catch (error) {
    handleError(error, 'channel create handler');
  }
}

/**
 * Handle channel deletion event
 * @param {Channel} channel - Discord channel object
 */
async function handleChannelDelete(channel) {
  try {
    console.log(`🗑️ Channel deleted: ${channel.name} in ${channel.guild.name}`);
    
    // Remove from raid channels cache if present
    const key = channel.guild.id;
    if (cacheManager.raidChannels.has(key)) {
      const raidChannels = cacheManager.raidChannels.get(key);
      const index = raidChannels.indexOf(channel.id);
      if (index > -1) {
        raidChannels.splice(index, 1);
        console.log(`✅ Removed channel ${channel.id} from raid channels cache`);
      }
    }
    
  } catch (error) {
    handleError(error, 'channel delete handler');
  }
}

module.exports = {
  handleChannelCreate,
  handleChannelDelete
}; 