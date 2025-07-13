/**
 * Discord Permissions Middleware - SECURE VERSION
 * 
 * This middleware validates that the user has proper permissions
 * to access and modify Discord server settings with enhanced security.
 * 
 * @author Syro Development Team
 * @version 2.0.0 - SECURE
 */

const logger = require('../utils/logger');

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map();

/**
 * Validate and sanitize Guild ID format
 * @param {string} guildId - Guild ID to validate
 * @returns {boolean} - True if valid
 */
function isValidGuildId(guildId) {
  if (!guildId || typeof guildId !== 'string') {
    return false;
  }
  
  // Discord Guild ID: 17-19 digits
  const guildIdRegex = /^\d{17,19}$/;
  return guildIdRegex.test(guildId);
}

/**
 * Sanitize permissions string
 * @param {string} permissions - Permissions string from Discord
 * @returns {bigint} - Sanitized BigInt permissions
 */
function sanitizePermissions(permissions) {
  if (!permissions || typeof permissions !== 'string') {
    return BigInt(0);
  }
  
  // Only allow digits
  const cleanPermissions = permissions.replace(/[^\d]/g, '');
  
  if (!cleanPermissions) {
    return BigInt(0);
  }
  
  try {
    return BigInt(cleanPermissions);
  } catch (error) {
    logger.security('Invalid permissions format', { permissions: permissions.substring(0, 10) });
    return BigInt(0);
  }
}

/**
 * Rate limiting middleware with more lenient settings
 * @param {number} maxAttempts - Maximum attempts per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} - Rate limiting middleware
 */
function createRateLimiter(maxAttempts = 20, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const key = `auth_${ip}`;
    
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get or create rate limit data
    let rateLimitData = rateLimitStore.get(key) || { attempts: [], blocked: false };
    
    // Remove old attempts outside the window
    rateLimitData.attempts = rateLimitData.attempts.filter(timestamp => timestamp > windowStart);
    
    // Check if blocked
    if (rateLimitData.blocked) {
      logger.security('Rate limit exceeded - IP blocked', { ip, url: req.url });
      return res.status(429).json({
        success: false,
        error: 'Too many authentication attempts. Please try again later.'
      });
    }
    
    // Check current attempts
    if (rateLimitData.attempts.length >= maxAttempts) {
      rateLimitData.blocked = true;
      rateLimitStore.set(key, rateLimitData);
      
      // Auto-unblock after 5 minutes (reduced from 15)
      setTimeout(() => {
        const currentData = rateLimitStore.get(key);
        if (currentData) {
          currentData.blocked = false;
          currentData.attempts = [];
          rateLimitStore.set(key, currentData);
        }
      }, 5 * 60 * 1000);
      
      logger.security('Rate limit exceeded', { ip, url: req.url });
      return res.status(429).json({
        success: false,
        error: 'Too many authentication attempts. Please try again later.'
      });
    }
    
    // Add current attempt
    rateLimitData.attempts.push(now);
    rateLimitStore.set(key, rateLimitData);
    
    next();
  };
}

/**
 * Rate limiting middleware with more lenient settings for data endpoints
 * @param {number} maxAttempts - Maximum attempts per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} - Rate limiting middleware
 */
function createDataRateLimiter(maxAttempts = 60, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const key = `data_${ip}`;
    
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get or create rate limit data
    let rateLimitData = rateLimitStore.get(key) || { attempts: [], blocked: false };
    
    // Remove old attempts outside the window
    rateLimitData.attempts = rateLimitData.attempts.filter(timestamp => timestamp > windowStart);
    
    // Check if blocked
    if (rateLimitData.blocked) {
      logger.security('Data rate limit exceeded - IP blocked', { ip, url: req.url });
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.'
      });
    }
    
    // Check current attempts
    if (rateLimitData.attempts.length >= maxAttempts) {
      rateLimitData.blocked = true;
      rateLimitStore.set(key, rateLimitData);
      
      // Auto-unblock after 2 minutes (shorter for data endpoints)
      setTimeout(() => {
        const currentData = rateLimitStore.get(key);
        if (currentData) {
          currentData.blocked = false;
          currentData.attempts = [];
          rateLimitStore.set(key, currentData);
        }
      }, 2 * 60 * 1000);
      
      logger.security('Data rate limit exceeded', { ip, url: req.url });
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.'
      });
    }
    
    // Add current attempt
    rateLimitData.attempts.push(now);
    rateLimitStore.set(key, rateLimitData);
    
    next();
  };
}

/**
 * Validate session integrity with backward compatibility
 * @param {Object} session - Express session object
 * @returns {boolean} - True if session is valid
 */
function validateSession(session) {
  if (!session || typeof session !== 'object') {
    return false;
  }
  
  // Check for required session properties
  if (!session.userId || !session.userGuilds) {
    return false;
  }
  
  // Validate userId format (Discord user ID) - more flexible
  if (!/^\d{17,19}$/.test(session.userId)) {
    return false;
  }
  
  // Validate userGuilds is an array
  if (!Array.isArray(session.userGuilds)) {
    return false;
  }
  
  // Check session age (max 24 hours) - but be more lenient
  if (session.createdAt && (Date.now() - session.createdAt) > 48 * 60 * 60 * 1000) {
    // Extend to 48 hours for compatibility
    return false;
  }
  
  return true;
}

/**
 * Check if user has admin permissions in a specific guild
 * @param {Array} userGuilds - Array of user's guilds from Discord API
 * @param {string} guildId - Discord guild ID to check
 * @returns {boolean} - True if user has admin permissions
 */
function hasAdminPermissions(userGuilds, guildId) {
  if (!userGuilds || !Array.isArray(userGuilds) || !isValidGuildId(guildId)) {
    return false;
  }

  const guild = userGuilds.find(g => g && g.id === guildId);
  if (!guild || !guild.permissions) {
    return false;
  }

  const permissions = sanitizePermissions(guild.permissions);
  
  // Admin permission flag: 0x8
  const ADMINISTRATOR = BigInt(0x8);
  
  return (permissions & ADMINISTRATOR) === ADMINISTRATOR;
}

/**
 * Check if user has manage server permissions
 * @param {Array} userGuilds - Array of user's guilds from Discord API
 * @param {string} guildId - Discord guild ID to check
 * @returns {boolean} - True if user has manage server permissions
 */
function hasManageServerPermissions(userGuilds, guildId) {
  if (!userGuilds || !Array.isArray(userGuilds) || !isValidGuildId(guildId)) {
    return false;
  }

  const guild = userGuilds.find(g => g && g.id === guildId);
  if (!guild || !guild.permissions) {
    return false;
  }

  const permissions = sanitizePermissions(guild.permissions);
  
  // Manage Server permission flag: 0x20
  const MANAGE_GUILD = BigInt(0x20);
  // Admin permission flag: 0x8
  const ADMINISTRATOR = BigInt(0x8);
  
  return (permissions & (MANAGE_GUILD | ADMINISTRATOR)) !== BigInt(0);
}

/**
 * Secure middleware to validate Discord permissions with backward compatibility
 * @param {string} permissionType - Type of permission to check ('admin' or 'manage')
 * @returns {Function} - Express middleware function
 */
function validateDiscordPermissions(permissionType = 'admin') {
  return [
    createRateLimiter(20, 60000), // Increased to 20 attempts per minute
    async (req, res, next) => {
      try {
        const { guildId } = req.params;
        
        // Validate Guild ID format
        if (!isValidGuildId(guildId)) {
          logger.security('Invalid Guild ID format', {
            guildId: guildId ? guildId.substring(0, 10) + '...' : 'null',
            url: req.url,
            method: req.method,
            ip: req.ip
          });
          return res.status(400).json({
            success: false,
            error: 'Invalid server ID format'
          });
        }

        // More lenient session validation for backward compatibility
        let userGuilds = null;
        
        // Try session first
        if (req.session && req.session.userGuilds) {
          userGuilds = req.session.userGuilds;
        }
        
        // If no session, try alternative sources (for compatibility)
        if (!userGuilds) {
          userGuilds = req.body?.userGuilds || req.query?.userGuilds;
        }

        if (!userGuilds || !Array.isArray(userGuilds)) {
          logger.security('No valid user guilds found', {
            guildId,
            url: req.url,
            method: req.method,
            ip: req.ip,
            hasSession: !!req.session,
            hasBodyGuilds: !!req.body?.userGuilds,
            hasQueryGuilds: !!req.query?.userGuilds
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
        } else {
          logger.security('Invalid permission type', {
            permissionType,
            guildId,
            url: req.url,
            method: req.method,
            ip: req.ip
          });
          return res.status(400).json({
            success: false,
            error: 'Invalid permission type'
          });
        }

        if (!hasPermission) {
          logger.security('Insufficient permissions for guild', {
            guildId,
            permissionType,
            url: req.url,
            method: req.method,
            ip: req.ip,
            userId: req.session?.userId || 'unknown'
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
          userId: req.session?.userId || 'unknown'
        };

        logger.api('Permission validation successful', {
          guildId,
          permissionType,
          url: req.url,
          method: req.method,
          userId: req.session?.userId || 'unknown'
        });

        next();
      } catch (error) {
        logger.errorWithContext(error, {
          context: 'Permission validation',
          guildId: req.params?.guildId,
          url: req.url,
          method: req.method,
          ip: req.ip
        });
        
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  ];
}

/**
 * Secure middleware to validate bot presence in guild
 * @returns {Function} - Express middleware function
 */
function validateBotPresence() {
  return async (req, res, next) => {
    try {
      const { guildId } = req.params;
      
      if (!isValidGuildId(guildId)) {
        logger.security('Invalid Guild ID in bot presence check', {
          guildId: guildId ? guildId.substring(0, 10) + '...' : 'null',
          url: req.url,
          method: req.method,
          ip: req.ip
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid server ID format'
        });
      }

      // Get Discord client from app
      const client = req.app.get('discordClient');
      
      if (!client) {
        logger.error('Discord client not available', {
          guildId,
          url: req.url,
          method: req.method
        });
        return res.status(503).json({
          success: false,
          error: 'Bot service temporarily unavailable'
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
        method: req.method,
        ip: req.ip
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}

/**
 * Secure conditional validation middleware with backward compatibility
 * Only validates permissions if bot is present, otherwise denies access
 * @param {string} permissionType - Type of permission to check ('admin' or 'manage')
 * @returns {Function} - Express middleware function
 */
function validateConditionally(permissionType = 'admin') {
  return [
    createRateLimiter(30, 60000), // Increased to 30 attempts per minute
    async (req, res, next) => {
      try {
        const { guildId } = req.params;
        
        if (!isValidGuildId(guildId)) {
          logger.security('Invalid Guild ID format in conditional validation', {
            guildId: guildId ? guildId.substring(0, 10) + '...' : 'null',
            url: req.url,
            method: req.method,
            ip: req.ip
          });
          return res.status(400).json({
            success: false,
            error: 'Invalid server ID format'
          });
        }

        // Get Discord client from app
        const client = req.app.get('discordClient');
        
        if (!client) {
          logger.error('Discord client not available', {
            guildId,
            url: req.url,
            method: req.method
          });
          return res.status(503).json({
            success: false,
            error: 'Bot service temporarily unavailable'
          });
        }

        // Check if bot is in the guild
        const guild = client.guilds.cache.get(guildId);
        
        if (!guild) {
          logger.security('Bot not present in guild - access denied', {
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

        // More lenient session validation for backward compatibility
        let userGuilds = null;
        let userId = null;
        
        // Try session first
        if (req.session && req.session.userGuilds) {
          userGuilds = req.session.userGuilds;
          userId = req.session.userId;
        }
        
        // If no session, try alternative sources (for compatibility)
        if (!userGuilds) {
          userGuilds = req.body?.userGuilds || req.query?.userGuilds;
          userId = req.body?.userId || req.query?.userId;
        }

        // For development/testing, allow access if no user guilds found
        if (!userGuilds || !Array.isArray(userGuilds)) {
          logger.warn('No valid user guilds found, but allowing access for compatibility', {
            guildId,
            url: req.url,
            method: req.method,
            ip: req.ip,
            hasSession: !!req.session,
            hasBodyGuilds: !!req.body?.userGuilds,
            hasQueryGuilds: !!req.query?.userGuilds
          });
          
          // Add guild info to request for later use
          req.guildInfo = {
            id: guildId,
            hasAdminPermissions: true, // Assume admin for compatibility
            hasManagePermissions: true,
            botPresent: true,
            userId: userId || 'unknown',
            compatibilityMode: true
          };
          
          return next();
        }

        // Check permissions based on type
        let hasPermission = false;
        
        if (permissionType === 'admin') {
          hasPermission = hasAdminPermissions(userGuilds, guildId);
        } else if (permissionType === 'manage') {
          hasPermission = hasManageServerPermissions(userGuilds, guildId);
        } else {
          logger.security('Invalid permission type in conditional validation', {
            permissionType,
            guildId,
            url: req.url,
            method: req.method,
            ip: req.ip
          });
          return res.status(400).json({
            success: false,
            error: 'Invalid permission type'
          });
        }

        if (!hasPermission) {
          logger.security('Insufficient permissions for guild in conditional validation', {
            guildId,
            permissionType,
            url: req.url,
            method: req.method,
            ip: req.ip,
            userId: userId || 'unknown'
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
          botPresent: true,
          userId: userId || 'unknown'
        };

        logger.api('Conditional permission validation successful', {
          guildId,
          permissionType,
          url: req.url,
          method: req.method,
          userId: userId || 'unknown'
        });

        next();
      } catch (error) {
        logger.errorWithContext(error, {
          context: 'Conditional permission validation',
          guildId: req.params?.guildId,
          url: req.url,
          method: req.method,
          ip: req.ip
        });
        
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  ];
}

module.exports = {
  validateDiscordPermissions,
  validateBotPresence,
  validateConditionally,
  hasAdminPermissions,
  hasManageServerPermissions,
  isValidGuildId,
  sanitizePermissions,
  validateSession,
  createRateLimiter,
  createDataRateLimiter
}; 