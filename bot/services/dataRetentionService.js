/**
 * Data Retention Service
 * 
 * Handles automatic data deletion scheduling and processing.
 * Runs background tasks to clean up server data based on retention policies.
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 */

const DataRetentionConfig = require('../models/DataRetentionConfig');
const logger = require('../utils/logger');

class DataRetentionService {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
  }

  /**
   * Start the data retention service
   */
  start() {
    if (this.isRunning) {
      logger.warn('Data retention service is already running');
      return;
    }

    logger.info('🚀 Starting data retention service...');
    this.isRunning = true;

    // Run initial check
    this.processScheduledDeletions();

    // Set up periodic checks
    this.interval = setInterval(() => {
      this.processScheduledDeletions();
    }, this.checkInterval);

    logger.info('✅ Data retention service started successfully');
  }

  /**
   * Stop the data retention service
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Data retention service is not running');
      return;
    }

    logger.info('🛑 Stopping data retention service...');
    this.isRunning = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    logger.info('✅ Data retention service stopped successfully');
  }

  /**
   * Process all scheduled deletions
   */
  async processScheduledDeletions() {
    try {
      const processedCount = await DataRetentionConfig.processScheduledDeletions();
      
      if (processedCount > 0) {
        logger.info(`🗑️ Processed ${processedCount} scheduled data deletions`);
      }
      
      return processedCount;
    } catch (error) {
      logger.error('❌ Error processing scheduled deletions:', error);
      throw error;
    }
  }

  /**
   * Handle bot leaving a server
   */
  async handleBotLeave(guildId) {
    try {
      logger.info(`🤖 Bot left server ${guildId}, handling data retention...`);
      
      const config = await DataRetentionConfig.handleBotLeave(guildId);
      
      if (config.immediateDeletion) {
        logger.info(`🗑️ Immediate deletion completed for server ${guildId}`);
      } else {
        logger.info(`⏰ Deletion scheduled for server ${guildId} in ${config.retentionDays} days`);
      }
      
      return config;
    } catch (error) {
      logger.error(`❌ Error handling bot leave for server ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      lastCheck: new Date()
    };
  }

  /**
   * Force process scheduled deletions (for manual triggers)
   */
  async forceProcess() {
    logger.info('🔧 Force processing scheduled deletions...');
    return await this.processScheduledDeletions();
  }

  /**
   * Get statistics about data retention
   */
  async getStats() {
    try {
      const totalConfigs = await DataRetentionConfig.countDocuments();
      const immediateDeletionConfigs = await DataRetentionConfig.countDocuments({ immediateDeletion: true });
      const scheduledDeletions = await DataRetentionConfig.countDocuments({ deletionScheduled: true });
      const dueForDeletion = await DataRetentionConfig.findDueForDeletion();

      return {
        totalConfigs,
        immediateDeletionConfigs,
        scheduledDeletions,
        dueForDeletion: dueForDeletion.length,
        serviceRunning: this.isRunning
      };
    } catch (error) {
      logger.error('Error getting data retention stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old data retention configs (for servers that no longer exist)
   */
  async cleanupOrphanedConfigs() {
    try {
      logger.info('🧹 Cleaning up orphaned data retention configs...');
      
      // This would need to be implemented based on your bot's guild list
      // For now, we'll just log that this feature is available
      logger.info('📋 Orphaned config cleanup feature available (requires guild list integration)');
      
      return 0;
    } catch (error) {
      logger.error('Error cleaning up orphaned configs:', error);
      throw error;
    }
  }
}

// Create singleton instance
const dataRetentionService = new DataRetentionService();

module.exports = dataRetentionService; 