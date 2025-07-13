/**
 * Data Retention API Routes
 * 
 * Handles data retention configuration endpoints for the dashboard.
 * Provides secure access to manage data deletion policies.
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const DataRetentionConfig = require('../models/DataRetentionConfig');
const { validateDiscordPermissions } = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitizer');
const logger = require('../utils/logger');

/**
 * GET /api/guild/:guildId/data-retention
 * Get data retention settings for a guild
 */
router.get('/:guildId/data-retention', validateDiscordPermissions('manage'), async (req, res) => {
  try {
    const { guildId } = req.params;
    
    if (!guildId) {
      return res.status(400).json({
        success: false,
        error: 'Guild ID is required'
      });
    }

    // Sanitize guild ID
    const sanitizedGuildId = sanitizeInput(guildId);
    
    // Check if user has access to this guild
    if (!req.user.guilds.some(guild => guild.id === sanitizedGuildId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this guild'
      });
    }

    // Get or create settings
    const settings = await DataRetentionConfig.getGuildSettings(sanitizedGuildId);
    
    logger.info(`Data retention settings retrieved for guild ${sanitizedGuildId} by user ${req.user.id}`);
    
    res.json({
      success: true,
      settings: {
        immediateDeletion: settings.immediateDeletion,
        retentionDays: settings.retentionDays,
        deleteLogs: settings.deleteLogs,
        deleteStats: settings.deleteStats,
        deleteConfig: settings.deleteConfig,
        scheduledForDeletion: settings.scheduledForDeletion,
        deletionScheduled: settings.deletionScheduled,
        lastModified: settings.updatedAt
      }
    });

  } catch (error) {
    logger.error('Error getting data retention settings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/guild/:guildId/data-retention
 * Update data retention settings for a guild
 */
router.post('/:guildId/data-retention', validateDiscordPermissions('manage'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const { settings } = req.body;
    
    if (!guildId) {
      return res.status(400).json({
        success: false,
        error: 'Guild ID is required'
      });
    }

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Settings object is required'
      });
    }

    // Sanitize guild ID
    const sanitizedGuildId = sanitizeInput(guildId);
    
    // Check if user has access to this guild
    if (!req.user.guilds.some(guild => guild.id === sanitizedGuildId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this guild'
      });
    }

    // Validate settings
    const validationErrors = validateSettings(settings);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings',
        details: validationErrors
      });
    }

    // Sanitize settings
    const sanitizedSettings = {
      immediateDeletion: Boolean(settings.immediateDeletion),
      retentionDays: Math.max(1, Math.min(7, parseInt(settings.retentionDays) || 3)),
      deleteLogs: Boolean(settings.deleteLogs),
      deleteStats: Boolean(settings.deleteStats),
      deleteConfig: Boolean(settings.deleteConfig)
    };

    // Update settings
    const updatedConfig = await DataRetentionConfig.updateGuildSettings(
      sanitizedGuildId,
      sanitizedSettings,
      req.user.id,
      'Updated via dashboard'
    );

    logger.info(`Data retention settings updated for guild ${sanitizedGuildId} by user ${req.user.id}`, {
      settings: sanitizedSettings,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Data retention settings updated successfully',
      settings: {
        immediateDeletion: updatedConfig.immediateDeletion,
        retentionDays: updatedConfig.retentionDays,
        deleteLogs: updatedConfig.deleteLogs,
        deleteStats: updatedConfig.deleteStats,
        deleteConfig: updatedConfig.deleteConfig,
        scheduledForDeletion: updatedConfig.scheduledForDeletion,
        deletionScheduled: updatedConfig.deletionScheduled,
        lastModified: updatedConfig.updatedAt
      }
    });

  } catch (error) {
    logger.error('Error updating data retention settings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/guild/:guildId/data-retention
 * Cancel scheduled deletion for a guild
 */
router.delete('/:guildId/data-retention', validateDiscordPermissions('manage'), async (req, res) => {
  try {
    const { guildId } = req.params;
    
    if (!guildId) {
      return res.status(400).json({
        success: false,
        error: 'Guild ID is required'
      });
    }

    // Sanitize guild ID
    const sanitizedGuildId = sanitizeInput(guildId);
    
    // Check if user has access to this guild
    if (!req.user.guilds.some(guild => guild.id === sanitizedGuildId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this guild'
      });
    }

    // Get current config
    const config = await DataRetentionConfig.findOne({ guildId: sanitizedGuildId });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Data retention configuration not found'
      });
    }

    if (!config.deletionScheduled) {
      return res.status(400).json({
        success: false,
        error: 'No deletion is currently scheduled'
      });
    }

    // Cancel scheduled deletion
    await config.cancelScheduledDeletion();

    logger.info(`Scheduled deletion cancelled for guild ${sanitizedGuildId} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Scheduled deletion cancelled successfully'
    });

  } catch (error) {
    logger.error('Error cancelling scheduled deletion:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/data-retention/process-scheduled
 * Process all scheduled deletions (admin only)
 */
router.post('/process-scheduled', validateDiscordPermissions('admin'), async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Process scheduled deletions
    const processedCount = await DataRetentionConfig.processScheduledDeletions();

    logger.info(`Scheduled deletions processed by admin ${req.user.id}`, {
      processedCount,
      adminId: req.user.id
    });

    res.json({
      success: true,
      message: `Processed ${processedCount} scheduled deletions`,
      processedCount
    });

  } catch (error) {
    logger.error('Error processing scheduled deletions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/data-retention/stats
 * Get data retention statistics (admin only)
 */
router.get('/stats', validateDiscordPermissions('admin'), async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Get statistics
    const totalConfigs = await DataRetentionConfig.countDocuments();
    const immediateDeletionConfigs = await DataRetentionConfig.countDocuments({ immediateDeletion: true });
    const scheduledDeletions = await DataRetentionConfig.countDocuments({ deletionScheduled: true });
    const dueForDeletion = await DataRetentionConfig.findDueForDeletion();

    const stats = {
      totalConfigs,
      immediateDeletionConfigs,
      scheduledDeletions,
      dueForDeletion: dueForDeletion.length,
      averageRetentionDays: await getAverageRetentionDays()
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('Error getting data retention stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Helper function to validate settings
 */
function validateSettings(settings) {
  const errors = [];

  if (typeof settings.immediateDeletion !== 'boolean') {
    errors.push('immediateDeletion must be a boolean');
  }

  if (typeof settings.retentionDays !== 'number' || settings.retentionDays < 1 || settings.retentionDays > 7) {
    errors.push('retentionDays must be a number between 1 and 7');
  }

  if (typeof settings.deleteLogs !== 'boolean') {
    errors.push('deleteLogs must be a boolean');
  }

  if (typeof settings.deleteStats !== 'boolean') {
    errors.push('deleteStats must be a boolean');
  }

  if (typeof settings.deleteConfig !== 'boolean') {
    errors.push('deleteConfig must be a boolean');
  }

  return errors;
}

/**
 * Helper function to get average retention days
 */
async function getAverageRetentionDays() {
  try {
    const result = await DataRetentionConfig.aggregate([
      {
        $group: {
          _id: null,
          averageRetentionDays: { $avg: '$retentionDays' }
        }
      }
    ]);
    
    return result.length > 0 ? Math.round(result[0].averageRetentionDays * 100) / 100 : 0;
  } catch (error) {
    logger.error('Error calculating average retention days:', error);
    return 0;
  }
}

module.exports = router; 