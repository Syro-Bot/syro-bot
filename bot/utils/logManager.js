/**
 * Log Manager for Real-time Dashboard
 * 
 * This utility handles creating and storing logs for the real-time dashboard.
 * It provides a centralized way to log bot activities and events.
 * 
 * @author Syro Development Team
 * @version 1.0.0
 */

const Log = require('../models/Log');
const logger = require('./logger');

/**
 * Log Manager Class
 * Handles all logging operations for the dashboard
 */
class LogManager {
  /**
   * Create a new log entry
   * @param {Object} logData - Log data object
   * @returns {Promise<Object>} - Created log entry
   */
  static async createLog(logData) {
    try {
      const log = new Log(logData);
      const savedLog = await log.save();
      
      // Log to console for debugging
      logger.bot(`Dashboard log created: ${logData.type} - ${logData.title}`, {
        guildId: logData.guildId,
        logId: savedLog._id
      });
      
      return savedLog;
    } catch (error) {
      logger.errorWithContext(error, {
        context: 'LogManager.createLog',
        logData
      });
      throw error;
    }
  }

  /**
   * Get recent logs for a guild
   * @param {string} guildId - Discord guild ID
   * @param {number} limit - Number of logs to retrieve (default: 30)
   * @returns {Promise<Array>} - Array of log entries
   */
  static async getRecentLogs(guildId, limit = 30) {
    try {
      const logs = await Log.find({ guildId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
      
      return logs;
    } catch (error) {
      logger.errorWithContext(error, {
        context: 'LogManager.getRecentLogs',
        guildId,
        limit
      });
      throw error;
    }
  }

  /**
   * Get logs by type for a guild
   * @param {string} guildId - Discord guild ID
   * @param {string} type - Log type
   * @param {number} limit - Number of logs to retrieve (default: 30)
   * @returns {Promise<Array>} - Array of log entries
   */
  static async getLogsByType(guildId, type, limit = 30) {
    try {
      const logs = await Log.find({ guildId, type })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
      
      return logs;
    } catch (error) {
      logger.errorWithContext(error, {
        context: 'LogManager.getLogsByType',
        guildId,
        type,
        limit
      });
      throw error;
    }
  }

  /**
   * Log user join event
   * @param {string} guildId - Discord guild ID
   * @param {Object} member - Discord member object
   */
  static async logUserJoin(guildId, member) {
    try {
      await this.createLog({
        guildId,
        type: 'user_join',
        title: 'User Joined',
        description: `${member.user.username} joined the server`,
        userId: member.user.id,
        username: member.user.username,
        userAvatar: member.user.displayAvatarURL({ dynamic: true }),
        severity: 'info'
      });
    } catch (error) {
      logger.errorWithContext(error, {
        context: 'LogManager.logUserJoin',
        guildId,
        userId: member.user.id
      });
    }
  }

  /**
   * Log user leave event
   * @param {string} guildId - Discord guild ID
   * @param {Object} member - Discord member object
   */
  static async logUserLeave(guildId, member) {
    try {
      await this.createLog({
        guildId,
        type: 'user_leave',
        title: 'User Left',
        description: `${member.user.username} left the server`,
        userId: member.user.id,
        username: member.user.username,
        userAvatar: member.user.displayAvatarURL({ dynamic: true }),
        severity: 'info'
      });
    } catch (error) {
      logger.errorWithContext(error, {
        context: 'LogManager.logUserLeave',
        guildId,
        userId: member.user.id
      });
    }
  }

  /**
   * Log role assignment
   * @param {string} guildId - Discord guild ID
   * @param {Object} member - Discord member object
   * @param {Object} role - Discord role object
   * @param {string} reason - Reason for assignment
   */
  static async logRoleAssignment(guildId, member, role, reason = 'Automatic assignment') {
    try {
      await this.createLog({
        guildId,
        type: 'role_assigned',
        title: 'Role Assigned',
        description: `${role.name} assigned to ${member.user.username} - ${reason}`,
        userId: member.user.id,
        username: member.user.username,
        userAvatar: member.user.displayAvatarURL({ dynamic: true }),
        roleId: role.id,
        roleName: role.name,
        metadata: { reason },
        severity: 'success'
      });
    } catch (error) {
      logger.errorWithContext(error, {
        context: 'LogManager.logRoleAssignment',
        guildId,
        userId: member.user.id,
        roleId: role.id
      });
    }
  }

  /**
   * Log raid detection
   * @param {string} guildId - Discord guild ID
   * @param {string} raidType - Type of raid detected
   * @param {Object} metadata - Additional raid information
   */
  static async logRaidDetected(guildId, raidType, metadata = {}) {
    try {
      await this.createLog({
        guildId,
        type: 'raid_detected',
        title: 'Raid Detected',
        description: `${raidType} raid detected - ${metadata.count || 0} users affected`,
        metadata: { raidType, ...metadata },
        severity: 'warning'
      });
    } catch (error) {
      logger.errorWithContext(error, {
        context: 'LogManager.logRaidDetected',
        guildId,
        raidType
      });
    }
  }

  /**
   * Log raid end
   * @param {string} guildId - Discord guild ID
   * @param {string} raidType - Type of raid that ended
   * @param {Object} metadata - Additional raid information
   */
  static async logRaidEnded(guildId, raidType, metadata = {}) {
    try {
      await this.createLog({
        guildId,
        type: 'raid_ended',
        title: 'Raid Ended',
        description: `${raidType} raid ended - ${metadata.actionsTaken || 0} actions taken`,
        metadata: { raidType, ...metadata },
        severity: 'success'
      });
    } catch (error) {
      logger.errorWithContext(error, {
        context: 'LogManager.logRaidEnded',
        guildId,
        raidType
      });
    }
  }

  /**
   * Log channel creation
   * @param {string} guildId - Discord guild ID
   * @param {Object} channel - Discord channel object
   * @param {string} createdBy - User who created the channel
   */
  static async logChannelCreated(guildId, channel, createdBy = 'Unknown') {
    try {
      await this.createLog({
        guildId,
        type: 'channel_created',
        title: 'Channel Created',
        description: `#${channel.name} created by ${createdBy}`,
        channelId: channel.id,
        channelName: channel.name,
        metadata: { createdBy },
        severity: 'info'
      });
    } catch (error) {
      logger.errorWithContext(error, {
        context: 'LogManager.logChannelCreated',
        guildId,
        channelId: channel.id
      });
    }
  }

  /**
   * Log lockdown start
   * @param {string} guildId - Discord guild ID
   * @param {string} reason - Reason for lockdown
   * @param {number} duration - Duration in minutes
   */
  static async logLockdownStarted(guildId, reason, duration) {
    try {
      await this.createLog({
        guildId,
        type: 'lockdown_started',
        title: 'Server Lockdown',
        description: `Server locked down for ${duration} minutes - ${reason}`,
        metadata: { reason, duration },
        severity: 'warning'
      });
    } catch (error) {
      logger.errorWithContext(error, {
        context: 'LogManager.logLockdownStarted',
        guildId,
        reason
      });
    }
  }

  /**
   * Log lockdown end
   * @param {string} guildId - Discord guild ID
   */
  static async logLockdownEnded(guildId) {
    try {
      await this.createLog({
        guildId,
        type: 'lockdown_ended',
        title: 'Lockdown Ended',
        description: 'Server lockdown has been lifted',
        severity: 'success'
      });
    } catch (error) {
      logger.errorWithContext(error, {
        context: 'LogManager.logLockdownEnded',
        guildId
      });
    }
  }

  /**
   * Log spam detection
   * @param {string} guildId - Discord guild ID
   * @param {Object} member - Discord member object
   * @param {string} reason - Spam detection reason
   */
  static async logSpamDetected(guildId, member, reason) {
    try {
      await this.createLog({
        guildId,
        type: 'spam_detected',
        title: 'Spam Detected',
        description: `Spam detected from ${member.user.username} - ${reason}`,
        userId: member.user.id,
        username: member.user.username,
        userAvatar: member.user.displayAvatarURL({ dynamic: true }),
        metadata: { reason },
        severity: 'warning'
      });
    } catch (error) {
      logger.errorWithContext(error, {
        context: 'LogManager.logSpamDetected',
        guildId,
        userId: member.user.id
      });
    }
  }

  /**
   * Log welcome message sent
   * @param {string} guildId - Discord guild ID
   * @param {Object} member - Discord member object
   * @param {string} channelName - Channel where welcome was sent
   */
  static async logWelcomeSent(guildId, member, channelName) {
    try {
      await this.createLog({
        guildId,
        type: 'welcome_sent',
        title: 'Welcome Sent',
        description: `Welcome message sent to ${member.user.username} in #${channelName}`,
        userId: member.user.id,
        username: member.user.username,
        userAvatar: member.user.displayAvatarURL({ dynamic: true }),
        channelName,
        severity: 'info'
      });
    } catch (error) {
      logger.errorWithContext(error, {
        context: 'LogManager.logWelcomeSent',
        guildId,
        userId: member.user.id
      });
    }
  }

  /**
   * Log boost detection
   * @param {string} guildId - Discord guild ID
   * @param {Object} member - Discord member object
   */
  static async logBoostDetected(guildId, member) {
    try {
      await this.createLog({
        guildId,
        type: 'boost_detected',
        title: 'Server Boosted',
        description: `${member.user.username} boosted the server!`,
        userId: member.user.id,
        username: member.user.username,
        userAvatar: member.user.displayAvatarURL({ dynamic: true }),
        severity: 'success'
      });
    } catch (error) {
      logger.errorWithContext(error, {
        context: 'LogManager.logBoostDetected',
        guildId,
        userId: member.user.id
      });
    }
  }

  /**
   * Log automod action
   * @param {string} guildId - Discord guild ID
   * @param {Object} member - Discord member object
   * @param {string} action - Action taken
   * @param {string} reason - Reason for action
   */
  static async logAutomodAction(guildId, member, action, reason) {
    try {
      await this.createLog({
        guildId,
        type: 'automod_action',
        title: 'AutoMod Action',
        description: `${action} applied to ${member.user.username} - ${reason}`,
        userId: member.user.id,
        username: member.user.username,
        userAvatar: member.user.displayAvatarURL({ dynamic: true }),
        metadata: { action, reason },
        severity: 'warning'
      });
    } catch (error) {
      logger.errorWithContext(error, {
        context: 'LogManager.logAutomodAction',
        guildId,
        userId: member.user.id,
        action
      });
    }
  }
}

module.exports = LogManager; 