/**
 * Discord Permissions Middleware
 * 
 * This middleware validates that the user has proper permissions
 * to access and modify Discord server settings.
 * 
 * @author Syro Development Team
 * @version 1.0.0
 */

const logger = require('../utils/logger');

/**
 * Check if user has admin permissions in a specific guild
 * @param {Object} userGuilds - Array of user's guilds from Discord API
 * @param {string} guildId - Discord guild ID to check
 * @returns {boolean} - True if user has admin permissions
 */
function hasAdminPermissions(userGuilds, guildId) {
  if (!userGuilds || !Array.isArray(userGuilds)) {
    return false;
  }

  const guild = userGuilds.find(g => g.id === guildId);
  if (!guild) {
    return false;
  }

  // Check if user has admin permissions
  // Discord returns permissions as a string that needs to be parsed
  const permissions = BigInt(guild.permissions || '0');
  
  // Admin permission flag: 0x8
  const ADMINISTRATOR = BigInt(0x8);
  
  return (permissions & ADMINISTRATOR) === ADMINISTRATOR;
}

/**
 * Check if user has manage server permissions
 * @param {Object} userGuilds - Array of user's guilds from Discord API
 * @param {string} guildId - Discord guild ID to check
 * @returns {boolean} - True if user has manage server permissions
 */
function hasManageServerPermissions(userGuilds, guildId) {
  if (!userGuilds || !Array.isArray(userGuilds)) {
    return false;
  }

  const guild = userGuilds.find(g => g.id === guildId);
  if (!guild) {
    return false;
  }

  const permissions = BigInt(guild.permissions || '0');
  
  // Manage Server permission flag: 0x20
  const MANAGE_GUILD = BigInt(0x20);
  // Admin permission flag: 0x8
  const ADMINISTRATOR = BigInt(0x8);
  
  return (permissions & (MANAGE_GUILD | ADMINISTRATOR)) !== BigInt(0);
}

/**
 * Middleware to validate Discord permissions
 * @param {string} permissionType - Type of permission to check ('admin' or 'manage')
 * @returns {Function} - Express middleware function
 */
function validateDiscordPermissions(permissionType = 'admin') {
  return async (req, res, next) => {
    try {
      const { guildId } = req.params;
      
      if (!guildId) {
        logger.security('Missing guildId in request', {
          url: req.url,
          method: req.method,
          ip: req.ip
        });
        return res.status(400).json({
          success: false,
          error: 'Guild ID is required'
        });
      }

      // Get user guilds from session or request
      let userGuilds = req.session?.userGuilds;
      
      // If not in session, try to get from request body or query
      if (!userGuilds) {
        userGuilds = req.body?.userGuilds || req.query?.userGuilds;
      }

      if (!userGuilds) {
        logger.security('No user guilds found in request', {
          guildId,
          url: req.url,
          method: req.method,
          ip: req.ip
        });
        return res.status(401).json({
          success: false,
          error: 'User guilds not found. Please log in again.'
        });
      }

      // Check permissions based on type
      let hasPermission = false;
      
      if (permissionType === 'admin') {
        hasPermission = hasAdminPermissions(userGuilds, guildId);
      } else if (permissionType === 'manage') {
        hasPermission = hasManageServerPermissions(userGuilds, guildId);
      }

      if (!hasPermission) {
        logger.security('Insufficient permissions for guild', {
          guildId,
          permissionType,
          url: req.url,
          method: req.method,
          ip: req.ip,
          userId: req.session?.userId
        });
        
        return res.status(403).json({
          success: false,
          error: `Insufficient permissions. You need ${permissionType} permissions in this server.`
        });
      }

      // Add guild info to request for later use
      req.guildInfo = {
        id: guildId,
        hasAdminPermissions: hasAdminPermissions(userGuilds, guildId),
        hasManagePermissions: hasManageServerPermissions(userGuilds, guildId)
      };

      logger.api('Permission validation successful', {
        guildId,
        permissionType,
        url: req.url,
        method: req.method
      });

      next();
    } catch (error) {
      logger.errorWithContext(error, {
        context: 'Permission validation',
        guildId: req.params?.guildId,
        url: req.url,
        method: req.method
      });
      
      res.status(500).json({
        success: false,
        error: 'Error validating permissions'
      });
    }
  };
}

/**
 * Middleware to validate bot presence in guild
 * @returns {Function} - Express middleware function
 */
function validateBotPresence() {
  return async (req, res, next) => {
    try {
      const { guildId } = req.params;
      
      if (!guildId) {
        return res.status(400).json({
          success: false,
          error: 'Guild ID is required'
        });
      }

      // Get Discord client from app
      const client = req.app.get('discordClient');
      
      if (!client) {
        logger.error('Discord client not available', {
          guildId,
          url: req.url
        });
        return res.status(500).json({
          success: false,
          error: 'Bot service unavailable'
        });
      }

      // Check if bot is in the guild
      const guild = client.guilds.cache.get(guildId);
      
      if (!guild) {
        logger.security('Bot not present in guild', {
          guildId,
          url: req.url,
          method: req.method,
          ip: req.ip
        });
        
        return res.status(404).json({
          success: false,
          error: 'Bot is not present in this server. Please invite the bot first.'
        });
      }

      // Add guild object to request
      req.discordGuild = guild;
      
      logger.api('Bot presence validation successful', {
        guildId,
        guildName: guild.name,
        url: req.url,
        method: req.method
      });

      next();
    } catch (error) {
      logger.errorWithContext(error, {
        context: 'Bot presence validation',
        guildId: req.params?.guildId,
        url: req.url,
        method: req.method
      });
      
      res.status(500).json({
        success: false,
        error: 'Error validating bot presence'
      });
    }
  };
}

/**
 * Conditional validation middleware
 * Only validates permissions if bot is present, otherwise allows access
 * @param {string} permissionType - Type of permission to check ('admin' or 'manage')
 * @returns {Function} - Express middleware function
 */
function validateConditionally(permissionType = 'admin') {
  return async (req, res, next) => {
    try {
      const { guildId } = req.params;
      
      if (!guildId) {
        logger.security('Missing guildId in request', {
          url: req.url,
          method: req.method,
          ip: req.ip
        });
        return res.status(400).json({
          success: false,
          error: 'Guild ID is required'
        });
      }

      // Get Discord client from app
      const client = req.app.get('discordClient');
      
      if (!client) {
        logger.error('Discord client not available', {
          guildId,
          url: req.url
        });
        return res.status(500).json({
          success: false,
          error: 'Bot service unavailable'
        });
      }

      // Check if bot is in the guild
      const guild = client.guilds.cache.get(guildId);
      
      if (!guild) {
        // Bot not present, but allow access (for development/testing)
        logger.info('Bot not present in guild, allowing access', {
          guildId,
          url: req.url,
          method: req.method
        });
        
        // Add guild info to request
        req.guildInfo = {
          id: guildId,
          hasAdminPermissions: true, // Assume admin for development
          hasManagePermissions: true,
          botPresent: false
        };
        
        return next();
      }

      // Bot is present, validate permissions
      let userGuilds = req.session?.userGuilds;
      
      logger.info('🔍 Validating permissions for guild with bot present', {
        guildId,
        hasSession: !!req.session,
        hasUserGuilds: !!userGuilds,
        userGuildsCount: userGuilds?.length || 0,
        sessionKeys: req.session ? Object.keys(req.session) : []
      });
      
      if (!userGuilds) {
        userGuilds = req.body?.userGuilds || req.query?.userGuilds;
        logger.info('🔍 Trying alternative sources for user guilds', {
          hasBodyGuilds: !!req.body?.userGuilds,
          hasQueryGuilds: !!req.query?.userGuilds
        });
      }

      // For development, always allow access even if user guilds not found
      if (!userGuilds) {
        logger.warn('⚠️ User guilds not found, but allowing access for development', {
          guildId,
          url: req.url,
          method: req.method
        });
        
        // Add guild info to request
        req.guildInfo = {
          id: guildId,
          hasAdminPermissions: true, // Assume admin for development
          hasManagePermissions: true,
          botPresent: true,
          developmentMode: true
        };
        
        return next();
      }

      // Check permissions based on type
      let hasPermission = false;
      
      if (permissionType === 'admin') {
        hasPermission = hasAdminPermissions(userGuilds, guildId);
      } else if (permissionType === 'manage') {
        hasPermission = hasManageServerPermissions(userGuilds, guildId);
      }

      if (!hasPermission) {
        logger.security('Insufficient permissions for guild', {
          guildId,
          permissionType,
          url: req.url,
          method: req.method,
          ip: req.ip,
          userId: req.session?.userId
        });
        
        return res.status(403).json({
          success: false,
          error: `Insufficient permissions. You need ${permissionType} permissions in this server.`
        });
      }

      // Add guild info to request for later use
      req.guildInfo = {
        id: guildId,
        hasAdminPermissions: hasAdminPermissions(userGuilds, guildId),
        hasManagePermissions: hasManageServerPermissions(userGuilds, guildId),
        botPresent: true
      };

      logger.api('Permission validation successful', {
        guildId,
        permissionType,
        url: req.url,
        method: req.method
      });

      next();
    } catch (error) {
      logger.errorWithContext(error, {
        context: 'Conditional permission validation',
        guildId: req.params?.guildId,
        url: req.url,
        method: req.method
      });
      
      res.status(500).json({
        success: false,
        error: 'Error validating permissions'
      });
    }
  };
}

module.exports = {
  validateDiscordPermissions,
  validateBotPresence,
  validateConditionally,
  hasAdminPermissions,
  hasManageServerPermissions
}; 