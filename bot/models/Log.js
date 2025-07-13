/**
 * Log Model for Real-time Dashboard Logs
 * 
 * This model stores logs for the real-time dashboard display,
 * including user joins, role assignments, raids, channel creations,
 * and other bot activities.
 * 
 * @author Syro Development Team
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'user_join',
      'user_leave', 
      'role_assigned',
      'role_removed',
      'raid_detected',
      'raid_ended',
      'channel_created',
      'channel_deleted',
      'channel_nuke',
      'lockdown_started',
      'lockdown_ended',
      'spam_detected',
      'message_deleted',
      'member_banned',
      'member_unbanned',
      'welcome_sent',
      'boost_detected',
      'automod_action',
      'nuke_command',
      'purge_command',
      'member_count_update'
    ]
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    default: null
  },
  username: {
    type: String,
    default: null
  },
  userAvatar: {
    type: String,
    default: null
  },
  channelId: {
    type: String,
    default: null
  },
  channelName: {
    type: String,
    default: null
  },
  roleId: {
    type: String,
    default: null
  },
  roleName: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'success'],
    default: 'info'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index for efficient querying by guild and time
logSchema.index({ guildId: 1, timestamp: -1 });

// Index for type-based queries
logSchema.index({ guildId: 1, type: 1, timestamp: -1 });

// TTL index to automatically delete old logs (keep last 30 days)
logSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Log', logSchema); 