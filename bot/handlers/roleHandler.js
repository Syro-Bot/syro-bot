/**
 * Role Handler
 * Handles role creation and deletion events for raid detection
 */

const cacheManager = require('../services/cacheManager');
const LogManager = require('../utils/logManager');
const { handleError } = require('../utils/errorHandler');

/**
 * Handle role creation event
 * @param {Role} role - Discord role object
 */
async function handleRoleCreate(role) {
  try {
    console.log(`🎭 Role created: ${role.name} in ${role.guild.name}`);
    
    // Get server configuration
    const config = await cacheManager.getServerConfig(role.guild.id);
    if (!config || !config.automodRules?.Raids) return;
    
    const raidRules = config.automodRules.Raids.filter(rule => rule.raidType === 'role');
    if (raidRules.length === 0) return;
    
    const rule = raidRules[0];
    const key = role.guild.id;
    
    if (!cacheManager.recentRoles.has(key)) {
      cacheManager.recentRoles.set(key, []);
    }
    
    const guildRoles = cacheManager.recentRoles.get(key);
    guildRoles.push({ timestamp: Date.now() });
    
    // Clean up old roles
    cacheManager.cleanupCache(cacheManager.recentRoles, rule.timeWindow, 'recentRoles');
    
    // Check if limit is exceeded
    if (guildRoles.length >= rule.roleCount) {
      // Log raid detection
      await LogManager.logRaidDetected(role.guild.id, 'role', {
        count: guildRoles.length,
        threshold: rule.roleCount,
        timeWindow: rule.timeWindow,
        lockdownDuration: rule.lockdownDuration
      });
      
      // Apply lockdown using debouncing
      cacheManager.debouncedRaidDetection(role.guild.id, 'role', () => {
        const lockdownService = require('../services/lockdownService');
        lockdownService.applyLockdown(role.guild, rule.lockdownDuration, 'role');
      });
      
      // Clear cache for this guild
      cacheManager.recentRoles.delete(key);
    }
    
  } catch (error) {
    handleError(error, 'role create handler');
  }
}

/**
 * Handle role deletion event
 * @param {Role} role - Discord role object
 */
async function handleRoleDelete(role) {
  try {
    console.log(`🗑️ Role deleted: ${role.name} in ${role.guild.name}`);
    
    // Log role deletion for audit purposes
    await LogManager.logRoleDeleted(role.guild.id, role);
    
  } catch (error) {
    handleError(error, 'role delete handler');
  }
}

module.exports = {
  handleRoleCreate,
  handleRoleDelete
}; 