/**
 * @fileoverview Permission Manager - Command Permission and Access Control System
 * 
 * Advanced permission management system for Discord bot commands.
 * Provides granular role-based access control, permission caching, and
 * integration with web dashboard for dynamic permission management.
 * 
 * Features:
 * - Role-based permission validation
 * - Permission hierarchy management
 * - Caching for performance optimization
 * - Web dashboard integration
 * - Permission inheritance and overrides
 * - Audit logging for permission changes
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const { Collection, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

/**
 * Permission Manager Class
 * 
 * Manages command permissions, role-based access control, and permission validation.
 * Provides efficient permission checking with caching and web dashboard integration.
 * 
 * @class PermissionManager
 */
class PermissionManager {
  /**
   * Initialize the Permission Manager
   * 
   * @param {Object} options - Configuration options
   * @param {boolean} options.enableCaching - Enable permission caching
   * @param {number} options.cacheTTL - Cache time-to-live in milliseconds
   * @param {boolean} options.enableAuditLogging - Enable permission audit logging
   */
  constructor(options = {}) {
    this.enableCaching = options.enableCaching !== false;
    this.cacheTTL = options.cacheTTL || 300000; // 5 minutes
    this.enableAuditLogging = options.enableAuditLogging !== false;
    
    // Permission storage
    this.permissions = new Collection();
    this.rolePermissions = new Collection();
    this.userPermissions = new Collection();
    
    // Cache system
    this.permissionCache = new Collection();
    this.roleCache = new Collection();
    
    // Audit logging
    this.auditLog = [];
    
    // Statistics
    this.stats = {
      totalChecks: 0,
      cacheHits: 0,
      cacheMisses: 0,
      deniedPermissions: 0,
      grantedPermissions: 0
    };
    
    // Initialize the system
    this._initialize();
  }

  /**
   * Initialize the permission manager
   * 
   * @private
   */
  _initialize() {
    try {
      logger.info('🛡️ Initializing Permission Manager...');
      
      // Setup cache invalidation
      this._setupCacheInvalidation();
      
      // Load default permissions
      this._loadDefaultPermissions();
      
      logger.info('✅ Permission Manager initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Permission Manager:', error);
      throw error;
    }
  }

  /**
   * Setup cache invalidation
   * 
   * @private
   */
  _setupCacheInvalidation() {
    if (this.enableCaching) {
      setInterval(() => {
        this.permissionCache.clear();
        this.roleCache.clear();
        logger.debug('🔄 Permission cache cleared');
      }, this.cacheTTL);
    }
  }

  /**
   * Load default permissions
   * 
   * @private
   */
  _loadDefaultPermissions() {
    // Default permission definitions
    const defaultPermissions = {
      admin: {
        commands: ['nuke', 'purge', 'ban', 'kick', 'mute', 'unmute'],
        roles: ['Administrator'],
        description: 'Administrative commands requiring high-level permissions'
      },
      moderation: {
        commands: ['warn', 'timeout', 'kick', 'ban'],
        roles: ['Moderator', 'Administrator'],
        description: 'Moderation commands for server management'
      },
      utility: {
        commands: ['avatar', 'userinfo', 'serverinfo', 'ping'],
        roles: ['@everyone'],
        description: 'Utility commands available to all users'
      },
      info: {
        commands: ['help', 'stats', 'invite'],
        roles: ['@everyone'],
        description: 'Information commands available to all users'
      }
    };

    // Register default permissions
    for (const [category, config] of Object.entries(defaultPermissions)) {
      this.permissions.set(category, config);
    }
  }

  /**
   * Check if a user has permission to use a command
   * 
   * @param {GuildMember} member - Discord guild member
   * @param {Object} command - Command object
   * @param {Guild} guild - Discord guild
   * @returns {Promise<boolean>} Permission status
   */
  async checkPermission(member, command, guild) {
    const startTime = Date.now();
    
    try {
      this.stats.totalChecks++;
      
      // Generate cache key
      const cacheKey = this._generateCacheKey(member.id, command.name, guild.id);
      
      // Check cache first
      if (this.enableCaching && this.permissionCache.has(cacheKey)) {
        this.stats.cacheHits++;
        return this.permissionCache.get(cacheKey);
      }
      
      this.stats.cacheMisses++;
      
      // Check bot permissions first
      if (!this._checkBotPermissions(command, guild)) {
        logger.warn(`❌ Bot lacks required permissions for command: ${command.name}`);
        return false;
      }
      
      // Check user permissions
      const hasPermission = await this._validateUserPermission(member, command, guild);
      
      // Cache the result
      if (this.enableCaching) {
        this.permissionCache.set(cacheKey, hasPermission);
      }
      
      // Update statistics
      if (hasPermission) {
        this.stats.grantedPermissions++;
      } else {
        this.stats.deniedPermissions++;
      }
      
      // Log permission check
      this._logPermissionCheck(member, command, guild, hasPermission, Date.now() - startTime);
      
      return hasPermission;
      
    } catch (error) {
      logger.error('❌ Permission check error:', error);
      return false;
    }
  }

  /**
   * Set permission for a role on a specific command
   * 
   * @param {string} guildId - Guild ID
   * @param {string} commandName - Command name
   * @param {string} roleId - Role ID
   * @param {boolean} allowed - Whether the role is allowed
   * @returns {Promise<boolean>} Success status
   */
  async setRolePermission(guildId, commandName, roleId, allowed) {
    try {
      // Validate inputs
      if (!guildId || !commandName || !roleId) {
        logger.error('❌ Invalid parameters for setRolePermission');
        return false;
      }
      
      // Initialize guild permissions if not exists
      if (!this.rolePermissions.has(guildId)) {
        this.rolePermissions.set(guildId, new Collection());
      }
      
      const guildPermissions = this.rolePermissions.get(guildId);
      
      if (!guildPermissions.has(commandName)) {
        guildPermissions.set(commandName, new Collection());
      }
      
      const commandPermissions = guildPermissions.get(commandName);
      
      // Set permission
      commandPermissions.set(roleId, {
        allowed,
        setBy: 'system',
        setAt: new Date(),
        expiresAt: null
      });
      
      // Clear cache for this guild
      this._clearGuildCache(guildId);
      
      // Log permission change
      this._logPermissionChange(guildId, commandName, roleId, allowed);
      
      logger.info(`✅ Role permission set: ${roleId} -> ${commandName} (${allowed})`);
      return true;
      
    } catch (error) {
      logger.error('❌ Failed to set role permission:', error);
      return false;
    }
  }

  /**
   * Remove permission for a role on a specific command
   * 
   * @param {string} guildId - Guild ID
   * @param {string} commandName - Command name
   * @param {string} roleId - Role ID
   * @returns {Promise<boolean>} Success status
   */
  async removeRolePermission(guildId, commandName, roleId) {
    try {
      const guildPermissions = this.rolePermissions.get(guildId);
      if (!guildPermissions) {
        logger.warn(`⚠️ No permissions found for guild: ${guildId}`);
        return false;
      }
      
      const commandPermissions = guildPermissions.get(commandName);
      if (!commandPermissions) {
        logger.warn(`⚠️ No permissions found for command: ${commandName}`);
        return false;
      }
      
      const removed = commandPermissions.delete(roleId);
      
      if (removed) {
        // Clear cache for this guild
        this._clearGuildCache(guildId);
        
        // Log permission removal
        this._logPermissionChange(guildId, commandName, roleId, null, 'removed');
        
        logger.info(`✅ Role permission removed: ${roleId} -> ${commandName}`);
      }
      
      return removed;
      
    } catch (error) {
      logger.error('❌ Failed to remove role permission:', error);
      return false;
    }
  }

  /**
   * Get all permissions for a guild
   * 
   * @param {string} guildId - Guild ID
   * @returns {Object} Guild permissions
   */
  getGuildPermissions(guildId) {
    try {
      const guildPermissions = this.rolePermissions.get(guildId);
      if (!guildPermissions) {
        return {};
      }
      
      const permissions = {};
      
      for (const [commandName, commandPermissions] of guildPermissions) {
        permissions[commandName] = {};
        
        for (const [roleId, permission] of commandPermissions) {
          permissions[commandName][roleId] = {
            allowed: permission.allowed,
            setBy: permission.setBy,
            setAt: permission.setAt,
            expiresAt: permission.expiresAt
          };
        }
      }
      
      return permissions;
      
    } catch (error) {
      logger.error(`❌ Error getting guild permissions for ${guildId}:`, error);
      return {};
    }
  }

  /**
   * Get permission statistics
   * 
   * @returns {Object} Permission statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheHitRate: this.stats.totalChecks > 0 ? 
        (this.stats.cacheHits / this.stats.totalChecks * 100).toFixed(2) : 0,
      totalGuilds: this.rolePermissions.size,
      totalAuditLogs: this.auditLog.length
    };
  }

  /**
   * Check bot permissions for a command
   * 
   * @param {Object} command - Command object
   * @param {Guild} guild - Discord guild
   * @returns {boolean} Bot permission status
   * @private
   */
  _checkBotPermissions(command, guild) {
    try {
      const botMember = guild.members.me;
      if (!botMember) {
        logger.error('❌ Bot member not found in guild');
        return false;
      }
      
      // Check if command has specific bot permissions
      if (command.botPermissions) {
        for (const permission of command.botPermissions) {
          if (!botMember.permissions.has(permission)) {
            logger.warn(`❌ Bot lacks permission: ${permission}`);
            return false;
          }
        }
      }
      
      return true;
      
    } catch (error) {
      logger.error('❌ Error checking bot permissions:', error);
      return false;
    }
  }

  /**
   * Validate user permission for a command
   * 
   * @param {GuildMember} member - Discord guild member
   * @param {Object} command - Command object
   * @param {Guild} guild - Discord guild
   * @returns {Promise<boolean>} User permission status
   * @private
   */
  async _validateUserPermission(member, guild, command) {
    try {
      // Check if user is bot owner (always allowed)
      if (member.id === process.env.BOT_OWNER_ID) {
        return true;
      }
      
      // Check guild-specific permissions first
      const guildPermissions = this.rolePermissions.get(guild.id);
      if (guildPermissions && guildPermissions.has(command.name)) {
        const commandPermissions = guildPermissions.get(command.name);
        
        // Check each role the user has
        for (const [roleId, permission] of commandPermissions) {
          if (member.roles.cache.has(roleId)) {
            return permission.allowed;
          }
        }
      }
      
      // Check default permissions
      const category = command.category;
      if (this.permissions.has(category)) {
        const categoryPermissions = this.permissions.get(category);
        
        // Check if user has any of the required roles
        for (const roleName of categoryPermissions.roles) {
          if (roleName === '@everyone') {
            return true; // Everyone can use this command
          }
          
          const role = guild.roles.cache.find(r => r.name === roleName);
          if (role && member.roles.cache.has(role.id)) {
            return true;
          }
        }
      }
      
      // Check Discord permissions
      if (command.permissions) {
        for (const permission of command.permissions) {
          if (member.permissions.has(permission)) {
            return true;
          }
        }
      }
      
      return false;
      
    } catch (error) {
      logger.error('❌ Error validating user permission:', error);
      return false;
    }
  }

  /**
   * Generate cache key for permission check
   * 
   * @param {string} userId - User ID
   * @param {string} commandName - Command name
   * @param {string} guildId - Guild ID
   * @returns {string} Cache key
   * @private
   */
  _generateCacheKey(userId, commandName, guildId) {
    return `${userId}:${commandName}:${guildId}`;
  }

  /**
   * Clear cache for a specific guild
   * 
   * @param {string} guildId - Guild ID
   * @private
   */
  _clearGuildCache(guildId) {
    if (!this.enableCaching) return;
    
    // Remove all cache entries for this guild
    for (const [key] of this.permissionCache) {
      if (key.includes(guildId)) {
        this.permissionCache.delete(key);
      }
    }
  }

  /**
   * Log permission check
   * 
   * @param {GuildMember} member - Discord guild member
   * @param {Object} command - Command object
   * @param {Guild} guild - Discord guild
   * @param {boolean} allowed - Permission result
   * @param {number} duration - Check duration in milliseconds
   * @private
   */
  _logPermissionCheck(member, command, guild, allowed, duration) {
    if (!this.enableAuditLogging) return;
    
    const logEntry = {
      type: 'permission_check',
      userId: member.id,
      username: member.user.tag,
      command: command.name,
      guildId: guild.id,
      guildName: guild.name,
      allowed,
      duration,
      timestamp: new Date()
    };
    
    this.auditLog.push(logEntry);
    
    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }
  }

  /**
   * Log permission change
   * 
   * @param {string} guildId - Guild ID
   * @param {string} commandName - Command name
   * @param {string} roleId - Role ID
   * @param {boolean|null} allowed - Permission value
   * @param {string} action - Action performed
   * @private
   */
  _logPermissionChange(guildId, commandName, roleId, allowed, action = 'set') {
    if (!this.enableAuditLogging) return;
    
    const logEntry = {
      type: 'permission_change',
      guildId,
      commandName,
      roleId,
      allowed,
      action,
      timestamp: new Date()
    };
    
    this.auditLog.push(logEntry);
    
    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }
  }

  /**
   * Get audit log entries
   * 
   * @param {Object} filters - Filter options
   * @param {string} filters.guildId - Filter by guild ID
   * @param {string} filters.commandName - Filter by command name
   * @param {string} filters.type - Filter by log type
   * @param {number} filters.limit - Maximum number of entries
   * @returns {Array} Filtered audit log entries
   */
  getAuditLog(filters = {}) {
    let entries = [...this.auditLog];
    
    if (filters.guildId) {
      entries = entries.filter(entry => entry.guildId === filters.guildId);
    }
    
    if (filters.commandName) {
      entries = entries.filter(entry => entry.commandName === filters.commandName);
    }
    
    if (filters.type) {
      entries = entries.filter(entry => entry.type === filters.type);
    }
    
    if (filters.limit) {
      entries = entries.slice(-filters.limit);
    }
    
    return entries;
  }

  /**
   * Clear audit log
   * 
   * @returns {boolean} Success status
   */
  clearAuditLog() {
    try {
      this.auditLog = [];
      logger.info('🗑️ Audit log cleared');
      return true;
    } catch (error) {
      logger.error('❌ Failed to clear audit log:', error);
      return false;
    }
  }
}

module.exports = PermissionManager; 