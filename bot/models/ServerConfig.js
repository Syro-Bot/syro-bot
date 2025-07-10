/**
 * Server Configuration Model
 * 
 * This model stores the configuration for each Discord server that uses the Syro bot.
 * It contains automoderation rules, server settings, and other configuration data.
 * 
 * @author Syro Development Team
 * @version 1.0.0
 */

const mongoose = require('mongoose');

/**
 * Schema for server configuration
 * Stores automoderation rules and server-specific settings
 */
const serverConfigSchema = new mongoose.Schema({
  /**
   * Discord Server ID
   * Unique identifier for the Discord server
   * Required and must be unique across all servers
   */
  serverId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  /**
   * Automoderation Rules Configuration
   * Contains all automoderation rules for the server
   */
  automodRules: {
    /**
     * Spam Detection Rules
     * Array of spam detection configurations
     */
    Spam: [{
      id: {
        type: Number,
        required: true,
        unique: true
      },
      title: {
        type: String,
        required: true,
        trim: true
      },
      description: {
        type: String,
        trim: true
      },
      messageCount: {
        type: Number,
        required: true,
        min: 1,
        max: 100
      },
      timeWindow: {
        type: Number,
        required: true,
        min: 1,
        max: 3600 // 1 hour in seconds
      }
    }],
    
    /**
     * Raid Protection Rules
     * Array of raid detection configurations for different types of raids
     */
    Raids: [{
      id: {
        type: Number,
        required: true,
        unique: true
      },
      title: {
        type: String,
        required: true,
        trim: true
      },
      description: {
        type: String,
        trim: true
      },
      joinCount: {
        type: Number,
        min: 1,
        max: 1000
      },
      timeWindow: {
        type: Number,
        required: true,
        min: 1,
        max: 3600 // 1 hour in seconds
      },
      lockdownDuration: {
        type: Number,
        required: true,
        min: 1,
        max: 1440 // 24 hours in minutes
      },
      channelCount: {
        type: Number,
        min: 1,
        max: 100
      },
      roleCount: {
        type: Number,
        min: 1,
        max: 100
      },
      /**
       * Type of raid to detect
       * - join: Detects rapid member joins
       * - channel: Detects rapid channel creation
       * - role: Detects rapid role creation
       */
      raidType: {
        type: String,
        enum: ['join', 'channel', 'role'],
        default: 'join',
        required: true
      }
    }]
  }
}, { 
  timestamps: true, // Adds createdAt and updatedAt fields
  collection: 'server_configs' // Explicit collection name
});

// Create indexes for better query performance
serverConfigSchema.index({ serverId: 1 });
serverConfigSchema.index({ 'automodRules.Spam.id': 1 });
serverConfigSchema.index({ 'automodRules.Raids.id': 1 });

module.exports = mongoose.model('ServerConfig', serverConfigSchema); 