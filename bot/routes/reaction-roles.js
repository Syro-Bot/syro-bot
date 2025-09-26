/**
 * Reaction Roles API Routes
 * 
 * Provides REST API endpoints for managing reaction role messages.
 * Includes CRUD operations, message sending, and configuration management.
 * Designed with proper validation, rate limiting, and security measures.
 * 
 * @author Syro Development Team
 * @version 1.0.0
 * @since 2024
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Import services and middleware
const reactionRoleService = require('../services/reactionRoleService');
const { jwtAuthMiddleware } = require('../middleware/jwtAuth');
const { handleError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * Rate limiting configuration for reaction role endpoints
 * Prevents abuse and ensures API stability
 */
const reactionRoleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests to reaction roles API, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to all reaction role endpoints
router.use(reactionRoleLimiter);

/**
 * Validation schemas for request validation
 */
const createReactionRoleValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('channelId')
    .isString()
    .notEmpty()
    .withMessage('Channel ID is required'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Content must not exceed 2000 characters'),
  body('emojiRoles')
    .isArray({ min: 1, max: 20 })
    .withMessage('Must have between 1 and 20 emoji-role pairs'),
  body('emojiRoles.*.emoji')
    .isString()
    .notEmpty()
    .withMessage('Emoji is required for each emoji-role pair'),
  body('emojiRoles.*.role.id')
    .isString()
    .notEmpty()
    .withMessage('Role ID is required for each emoji-role pair'),
  body('emojiRoles.*.role.name')
    .isString()
    .notEmpty()
    .withMessage('Role name is required for each emoji-role pair'),
  body('options.allowMultipleRoles')
    .optional()
    .isBoolean()
    .withMessage('allowMultipleRoles must be a boolean'),
  body('options.maxRolesPerUser')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('maxRolesPerUser must be between 1 and 20'),
  body('options.cooldownSeconds')
    .optional()
    .isInt({ min: 0, max: 3600 })
    .withMessage('cooldownSeconds must be between 0 and 3600')
];

const updateReactionRoleValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid reaction role ID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Content must not exceed 2000 characters'),
  body('emojiRoles')
    .optional()
    .isArray({ min: 1, max: 20 })
    .withMessage('Must have between 1 and 20 emoji-role pairs')
];

/**
 * GET /api/reaction-roles/:guildId
 * Get all active reaction roles for a server
 */
router.get('/:guildId', 
  param('guildId').isString().notEmpty().withMessage('Guild ID is required'),
  jwtAuthMiddleware,
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
      const userId = req.user.id;

      logger.info(`Fetching reaction roles for guild ${guildId}`, { userId });

      // Get reaction roles from service
      const reactionRoles = await reactionRoleService.getReactionRolesByServer(guildId);

      res.json({
        success: true,
        data: {
          reactionRoles,
          count: reactionRoles.length
        }
      });

    } catch (error) {
      handleError(error, 'GET reaction roles');
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reaction roles'
      });
    }
  }
);

/**
 * POST /api/reaction-roles/:guildId
 * Create a new reaction role message
 */
router.post('/:guildId',
  param('guildId').isString().notEmpty().withMessage('Guild ID is required'),
  createReactionRoleValidation,
  jwtAuthMiddleware,
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
      const userId = req.user.id;
      const reactionRoleData = req.body;

      logger.info(`Creating reaction role in guild ${guildId}`, {
        userId,
        title: reactionRoleData.title,
        emojiRolesCount: reactionRoleData.emojiRoles.length
      });

      // Create reaction role configuration
      const reactionRole = await reactionRoleService.createReactionRoleMessage({
        ...reactionRoleData,
        serverId: guildId,
        createdBy: userId
      });

      res.status(201).json({
        success: true,
        data: {
          reactionRole,
          message: 'Reaction role configuration created successfully'
        }
      });

    } catch (error) {
      handleError(error, 'POST reaction role');
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create reaction role'
      });
    }
  }
);

/**
 * POST /api/reaction-roles/:guildId/:id/send
 * Send reaction role message to Discord channel
 */
router.post('/:guildId/:id/send',
  param('guildId').isString().notEmpty().withMessage('Guild ID is required'),
  param('id').isMongoId().withMessage('Invalid reaction role ID'),
  jwtAuthMiddleware,
  async (req, res) => {
    try {
      const { guildId, id } = req.params;
      const userId = req.user.id;

      logger.info(`Sending reaction role message`, {
        guildId,
        reactionRoleId: id,
        userId
      });

      // Get Discord client from request
      const client = req.app.locals.discordClient;
      if (!client) {
        throw new Error('Discord client not available');
      }

      // Get guild and channel
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({
          success: false,
          error: 'Guild not found'
        });
      }

      // Get reaction role configuration
      const reactionRole = await reactionRoleService.getReactionRoleByMessageId(id);
      if (!reactionRole || reactionRole.serverId !== guildId) {
        return res.status(404).json({
          success: false,
          error: 'Reaction role not found'
        });
      }

      // Get channel
      const channel = guild.channels.cache.get(reactionRole.channelId);
      if (!channel) {
        return res.status(404).json({
          success: false,
          error: 'Channel not found'
        });
      }

      // Send message to Discord
      const result = await reactionRoleService.sendReactionRoleMessage(reactionRole, channel);

      res.json({
        success: true,
        data: {
          messageId: result.message.id,
          channelId: channel.id,
          message: 'Reaction role message sent successfully'
        }
      });

    } catch (error) {
      handleError(error, 'POST send reaction role');
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send reaction role message'
      });
    }
  }
);

/**
 * PUT /api/reaction-roles/:guildId/:id
 * Update reaction role configuration
 */
router.put('/:guildId/:id',
  param('guildId').isString().notEmpty().withMessage('Guild ID is required'),
  param('id').isMongoId().withMessage('Invalid reaction role ID'),
  updateReactionRoleValidation,
  jwtAuthMiddleware,
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

      const { guildId, id } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      logger.info(`Updating reaction role ${id} in guild ${guildId}`, {
        userId,
        updates: Object.keys(updates)
      });

      // Update reaction role
      const updatedReactionRole = await reactionRoleService.updateReactionRole(
        id,
        updates,
        userId
      );

      // Verify server ownership
      if (updatedReactionRole.serverId !== guildId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this reaction role'
        });
      }

      res.json({
        success: true,
        data: {
          reactionRole: updatedReactionRole,
          message: 'Reaction role updated successfully'
        }
      });

    } catch (error) {
      handleError(error, 'PUT reaction role');
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update reaction role'
      });
    }
  }
);

/**
 * DELETE /api/reaction-roles/:guildId/:id
 * Delete reaction role configuration
 */
router.delete('/:guildId/:id',
  param('guildId').isString().notEmpty().withMessage('Guild ID is required'),
  param('id').isMongoId().withMessage('Invalid reaction role ID'),
  jwtAuthMiddleware,
  async (req, res) => {
    try {
      const { guildId, id } = req.params;
      const userId = req.user.id;

      logger.info(`Deleting reaction role ${id} in guild ${guildId}`, { userId });

      // Delete reaction role
      await reactionRoleService.deleteReactionRole(id, guildId);

      res.json({
        success: true,
        data: {
          message: 'Reaction role deleted successfully'
        }
      });

    } catch (error) {
      handleError(error, 'DELETE reaction role');
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete reaction role'
      });
    }
  }
);

/**
 * GET /api/reaction-roles/:guildId/:id
 * Get specific reaction role configuration
 */
router.get('/:guildId/:id',
  param('guildId').isString().notEmpty().withMessage('Guild ID is required'),
  param('id').isMongoId().withMessage('Invalid reaction role ID'),
  jwtAuthMiddleware,
  async (req, res) => {
    try {
      const { guildId, id } = req.params;
      const userId = req.user.id;

      logger.info(`Fetching reaction role ${id} in guild ${guildId}`, { userId });

      // Get reaction role by ID
      const reactionRole = await reactionRoleService.getReactionRoleByMessageId(id);
      
      if (!reactionRole || reactionRole.serverId !== guildId) {
        return res.status(404).json({
          success: false,
          error: 'Reaction role not found'
        });
      }

      res.json({
        success: true,
        data: {
          reactionRole
        }
      });

    } catch (error) {
      handleError(error, 'GET reaction role by ID');
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reaction role'
      });
    }
  }
);

/**
 * POST /api/reaction-roles/:guildId/:id/duplicate
 * Duplicate an existing reaction role configuration
 */
router.post('/:guildId/:id/duplicate',
  param('guildId').isString().notEmpty().withMessage('Guild ID is required'),
  param('id').isMongoId().withMessage('Invalid reaction role ID'),
  jwtAuthMiddleware,
  async (req, res) => {
    try {
      const { guildId, id } = req.params;
      const userId = req.user.id;

      logger.info(`Duplicating reaction role ${id} in guild ${guildId}`, { userId });

      // Get original reaction role
      const originalReactionRole = await reactionRoleService.getReactionRoleByMessageId(id);
      
      if (!originalReactionRole || originalReactionRole.serverId !== guildId) {
        return res.status(404).json({
          success: false,
          error: 'Reaction role not found'
        });
      }

      // Create duplicate with modified title
      const duplicateData = {
        ...originalReactionRole.toObject(),
        title: `${originalReactionRole.title} (Copy)`,
        messageId: undefined, // Reset message ID
        createdBy: userId,
        updatedBy: userId
      };

      delete duplicateData._id;
      delete duplicateData.createdAt;
      delete duplicateData.updatedAt;

      const duplicatedReactionRole = await reactionRoleService.createReactionRoleMessage({
        ...duplicateData,
        serverId: guildId,
        createdBy: userId
      });

      res.status(201).json({
        success: true,
        data: {
          reactionRole: duplicatedReactionRole,
          message: 'Reaction role duplicated successfully'
        }
      });

    } catch (error) {
      handleError(error, 'POST duplicate reaction role');
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to duplicate reaction role'
      });
    }
  }
);

/**
 * GET /api/reaction-roles/:guildId/stats/overview
 * Get overview statistics for reaction roles in a server
 */
router.get('/:guildId/stats/overview',
  param('guildId').isString().notEmpty().withMessage('Guild ID is required'),
  jwtAuthMiddleware,
  async (req, res) => {
    try {
      const { guildId } = req.params;
      const userId = req.user.id;

      logger.info(`Fetching reaction role stats for guild ${guildId}`, { userId });

      // Get all reaction roles for the server
      const reactionRoles = await reactionRoleService.getReactionRolesByServer(guildId);

      // Calculate statistics
      const stats = {
        totalReactionRoles: reactionRoles.length,
        activeReactionRoles: reactionRoles.filter(rr => rr.isActive).length,
        totalEmojiRoles: reactionRoles.reduce((sum, rr) => sum + rr.emojiRoles.length, 0),
        averageEmojiRolesPerMessage: reactionRoles.length > 0 
          ? Math.round(reactionRoles.reduce((sum, rr) => sum + rr.emojiRoles.length, 0) / reactionRoles.length * 100) / 100
          : 0,
        messagesWithEmbeds: reactionRoles.filter(rr => 
          rr.embed && (rr.embed.title || rr.embed.description)
        ).length,
        multipleRolesEnabled: reactionRoles.filter(rr => rr.allowMultipleRoles).length
      };

      res.json({
        success: true,
        data: {
          stats,
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (error) {
      handleError(error, 'GET reaction role stats');
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reaction role statistics'
      });
    }
  }
);

module.exports = router; 