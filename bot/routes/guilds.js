/**
 * @fileoverview Guilds Routes
 *
 * Routes for handling Discord guild/server operations.
 * Includes endpoints for getting guild information, roles, and other guild-related data.
 *
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 */

const express = require('express');
const { param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();

/**
 * Rate limiter for guilds endpoints
 * Prevents abuse and excessive requests.
 */
const guildsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many guild requests, please try again later.'
  }
});

// Apply rate limiting to all guilds endpoints
router.use('/', guildsLimiter);

/**
 * GET /api/guilds/:guildId/roles
 * Get all roles from a guild that the bot can manage
 */
router.get('/:guildId/roles', 
  param('guildId').isString().notEmpty().withMessage('Guild ID is required'),
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { guildId } = req.params;
      
      console.log('🔍 Requesting roles for guild ID:', guildId);
      
      // Get Discord client from app locals
      const client = req.app.locals.discordClient;
      if (!client) {
        return res.status(500).json({
          success: false,
          error: 'Discord client not available'
        });
      }

      // Get guild
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({
          success: false,
          error: 'Guild not found'
        });
      }

      // Get bot member to check permissions
      const botMember = guild.members.me;
      if (!botMember) {
        console.error('❌ Bot not found in guild');
        return res.status(500).json({
          success: false,
          error: 'Bot not found in guild'
        });
      }

      console.log('✅ Bot member found, highest role position:', botMember.roles.highest.position);

      // Check if bot has permission to manage roles
      if (!botMember.permissions.has('ManageRoles')) {
        return res.status(403).json({
          success: false,
          error: 'Bot does not have permission to manage roles'
        });
      }

      // Get all roles from the guild
      const roles = guild.roles.cache
        .filter(role => {
          // Filter out roles that the bot cannot manage
          // Bot cannot manage roles higher than its own position
          if (role.position >= botMember.roles.highest.position) {
            return false;
          }
          
          // Filter out managed roles (bot roles, integration roles)
          if (role.managed) {
            return false;
          }
          
          // Filter out @everyone role
          if (role.id === guild.id) {
            return false;
          }
          
          return true;
        })
        .map(role => ({
          id: role.id,
          name: role.name,
          color: role.hexColor,
          position: role.position,
          permissions: role.permissions.toArray(),
          mentionable: role.mentionable,
          hoist: role.hoist
        }))
        .sort((a, b) => b.position - a.position); // Sort by position (highest first)

      console.log('✅ Roles filtered and processed:', roles.length, 'manageable roles found');
      console.log('📋 Role names:', roles.map(r => r.name));
      
      res.json({
        success: true,
        roles: roles,
        count: roles.length,
        botHighestRole: botMember.roles.highest.position
      });

    } catch (error) {
      console.error('Error fetching guild roles:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/guilds/:guildId
 * Get basic guild information
 */
router.get('/:guildId',
  param('guildId').isString().notEmpty().withMessage('Guild ID is required'),
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { guildId } = req.params;
      
      // Get Discord client from app locals
      const client = req.app.locals.discordClient;
      if (!client) {
        return res.status(500).json({
          success: false,
          error: 'Discord client not available'
        });
      }

      // Get guild
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({
          success: false,
          error: 'Guild not found'
        });
      }

      // Get bot member
      const botMember = guild.members.me;
      
      // Get guild information
      const guildInfo = {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL({ dynamic: true }),
        memberCount: guild.memberCount,
        ownerId: guild.ownerId,
        botMember: botMember ? {
          id: botMember.id,
          username: botMember.user.username,
          highestRole: botMember.roles.highest.position,
          permissions: botMember.permissions.toArray()
        } : null,
        features: guild.features,
        premiumTier: guild.premiumTier,
        premiumSubscriptionCount: guild.premiumSubscriptionCount,
        createdAt: guild.createdAt.toISOString()
      };

      res.json({
        success: true,
        guild: guildInfo
      });

    } catch (error) {
      console.error('Error fetching guild info:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

module.exports = router; 