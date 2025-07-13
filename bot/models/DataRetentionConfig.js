/**
 * Data Retention Configuration Model
 * 
 * Manages data retention settings for servers when the bot leaves.
 * Handles immediate deletion, retention periods, and data type selection.
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const dataRetentionConfigSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Core settings
  immediateDeletion: {
    type: Boolean,
    default: false,
    description: 'Delete all data immediately when bot leaves'
  },
  
  retentionDays: {
    type: Number,
    default: 3,
    min: 1,
    max: 7,
    description: 'Days to retain data after bot leaves (1-7 days)'
  },
  
  // Data type selection
  deleteLogs: {
    type: Boolean,
    default: true,
    description: 'Delete server logs and audit trails'
  },
  
  deleteStats: {
    type: Boolean,
    default: true,
    description: 'Delete member counts and join/leave statistics'
  },
  
  deleteConfig: {
    type: Boolean,
    default: false,
    description: 'Delete bot configuration and settings'
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Tracking for deletion scheduling
  scheduledForDeletion: {
    type: Date,
    default: null,
    description: 'When this server data should be deleted'
  },
  
  deletionScheduled: {
    type: Boolean,
    default: false,
    description: 'Whether deletion has been scheduled'
  },
  
  // Audit trail
  lastModifiedBy: {
    type: String,
    description: 'User ID who last modified these settings'
  },
  
  modificationReason: {
    type: String,
    description: 'Reason for the last modification'
  }
}, {
  timestamps: true,
  collection: 'dataRetentionConfigs'
});

// Indexes for performance
dataRetentionConfigSchema.index({ guildId: 1 });
dataRetentionConfigSchema.index({ scheduledForDeletion: 1 });
dataRetentionConfigSchema.index({ deletionScheduled: 1 });

// Pre-save middleware to update timestamps
dataRetentionConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for checking if deletion is due
dataRetentionConfigSchema.virtual('isDeletionDue').get(function() {
  if (!this.scheduledForDeletion) return false;
  return new Date() >= this.scheduledForDeletion;
});

// Static method to get default settings
dataRetentionConfigSchema.statics.getDefaultSettings = function() {
  return {
    immediateDeletion: false,
    retentionDays: 3,
    deleteLogs: true,
    deleteStats: true,
    deleteConfig: false
  };
};

// Instance method to schedule deletion
dataRetentionConfigSchema.methods.scheduleDeletion = function() {
  if (this.immediateDeletion) {
    this.scheduledForDeletion = new Date();
  } else {
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + this.retentionDays);
    this.scheduledForDeletion = deletionDate;
  }
  
  this.deletionScheduled = true;
  return this.save();
};

// Instance method to cancel scheduled deletion
dataRetentionConfigSchema.methods.cancelScheduledDeletion = function() {
  this.scheduledForDeletion = null;
  this.deletionScheduled = false;
  return this.save();
};

// Static method to find servers due for deletion
dataRetentionConfigSchema.statics.findDueForDeletion = function() {
  return this.find({
    deletionScheduled: true,
    scheduledForDeletion: { $lte: new Date() }
  });
};

// Static method to get settings for a guild
dataRetentionConfigSchema.statics.getGuildSettings = async function(guildId) {
  let config = await this.findOne({ guildId });
  
  if (!config) {
    // Create default config if none exists
    config = new this({
      guildId,
      ...this.getDefaultSettings()
    });
    await config.save();
  }
  
  return config;
};

// Static method to update guild settings
dataRetentionConfigSchema.statics.updateGuildSettings = async function(guildId, settings, userId = null, reason = null) {
  const config = await this.getGuildSettings(guildId);
  
  // Update settings
  Object.assign(config, settings);
  
  // Update audit fields
  if (userId) config.lastModifiedBy = userId;
  if (reason) config.modificationReason = reason;
  
  return config.save();
};

// Static method to handle bot leaving a server
dataRetentionConfigSchema.statics.handleBotLeave = async function(guildId) {
  console.log(`🤖 Bot left server ${guildId}, checking data retention settings...`);
  
  const config = await this.getGuildSettings(guildId);
  
  if (config.immediateDeletion) {
    console.log(`🗑️ Immediate deletion enabled for server ${guildId}`);
    await this.deleteServerData(guildId);
  } else {
    console.log(`⏰ Scheduling deletion for server ${guildId} in ${config.retentionDays} days`);
    await config.scheduleDeletion();
  }
  
  return config;
};

// Static method to delete server data
dataRetentionConfigSchema.statics.deleteServerData = async function(guildId) {
  console.log(`🗑️ Deleting data for server ${guildId}...`);
  
  try {
    const config = await this.findOne({ guildId });
    const deletionResults = {};
    
    // Delete logs if enabled
    if (config?.deleteLogs !== false) {
      const Log = require('./Log');
      const logResult = await Log.deleteMany({ guildId });
      deletionResults.logs = logResult.deletedCount;
      console.log(`📝 Deleted ${logResult.deletedCount} logs for server ${guildId}`);
    }
    
    // Delete stats if enabled
    if (config?.deleteStats !== false) {
      const Join = require('./Join');
      const joinResult = await Join.deleteMany({ guildId });
      deletionResults.stats = joinResult.deletedCount;
      console.log(`📊 Deleted ${joinResult.deletedCount} join records for server ${guildId}`);
      
      const MemberCountChannel = require('./MemberCountChannel');
      const memberCountResult = await MemberCountChannel.deleteMany({ guildId });
      deletionResults.memberCount = memberCountResult.deletedCount;
      console.log(`👥 Deleted ${memberCountResult.deletedCount} member count channels for server ${guildId}`);
    }
    
    // Delete config if enabled
    if (config?.deleteConfig) {
      const WelcomeConfig = require('./WelcomeConfig');
      const welcomeResult = await WelcomeConfig.deleteMany({ guildId });
      deletionResults.welcomeConfig = welcomeResult.deletedCount;
      console.log(`🎉 Deleted ${welcomeResult.deletedCount} welcome configs for server ${guildId}`);
      
      const AnnouncementConfig = require('./AnnouncementConfig');
      const announcementResult = await AnnouncementConfig.deleteMany({ guildId });
      deletionResults.announcementConfig = announcementResult.deletedCount;
      console.log(`📢 Deleted ${announcementResult.deletedCount} announcement configs for server ${guildId}`);
      
      const ServerConfig = require('./ServerConfig');
      const serverConfigResult = await ServerConfig.deleteMany({ guildId });
      deletionResults.serverConfig = serverConfigResult.deletedCount;
      console.log(`⚙️ Deleted ${serverConfigResult.deletedCount} server configs for server ${guildId}`);
      
      const Template = require('./Template');
      const templateResult = await Template.deleteMany({ guildId });
      deletionResults.templates = templateResult.deletedCount;
      console.log(`📄 Deleted ${templateResult.deletedCount} templates for server ${guildId}`);
    }
    
    // Delete this config itself
    await this.deleteOne({ guildId });
    console.log(`✅ Data retention config deleted for server ${guildId}`);
    
    console.log(`🎯 Server ${guildId} data deletion completed:`, deletionResults);
    return deletionResults;
    
  } catch (error) {
    console.error(`❌ Error deleting data for server ${guildId}:`, error);
    throw error;
  }
};

// Static method to process scheduled deletions
dataRetentionConfigSchema.statics.processScheduledDeletions = async function() {
  console.log('🕐 Processing scheduled data deletions...');
  
  try {
    const dueForDeletion = await this.findDueForDeletion();
    console.log(`📋 Found ${dueForDeletion.length} servers due for deletion`);
    
    for (const config of dueForDeletion) {
      try {
        await this.deleteServerData(config.guildId);
      } catch (error) {
        console.error(`❌ Failed to delete data for server ${config.guildId}:`, error);
      }
    }
    
    console.log(`✅ Processed ${dueForDeletion.length} scheduled deletions`);
    return dueForDeletion.length;
    
  } catch (error) {
    console.error('❌ Error processing scheduled deletions:', error);
    throw error;
  }
};

module.exports = mongoose.model('DataRetentionConfig', dataRetentionConfigSchema); 