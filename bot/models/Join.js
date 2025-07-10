/**
 * Join Event Model
 * 
 * This model tracks member join events for Discord servers.
 * Used for analytics, welcome message tracking, and join raid detection.
 * 
 * @author Syro Development Team
 * @version 1.0.0
 */

const mongoose = require('mongoose');

/**
 * Schema for tracking member join events
 * Records when users join Discord servers for analytics and moderation
 */
const joinSchema = new mongoose.Schema({
  /**
   * Discord User ID
   * Unique identifier for the user who joined
   * Required for tracking individual users
   */
  userId: { 
    type: String, 
    required: true,
    index: true
  },
  
  /**
   * Discord Username
   * Display name of the user at the time of joining
   * Required for human-readable logs
   */
  username: { 
    type: String, 
    required: true,
    trim: true
  },
  
  /**
   * Discord Guild/Server ID
   * Unique identifier for the server the user joined
   * Required for server-specific tracking
   */
  guildId: { 
    type: String, 
    required: true,
    index: true
  },
  
  /**
   * Discord Guild/Server Name
   * Display name of the server at the time of joining
   * Required for human-readable logs
   */
  guildName: { 
    type: String, 
    required: true,
    trim: true
  },
  
  /**
   * Join Timestamp
   * When the user joined the server
   * Required for time-based analytics and raid detection
   */
  timestamp: { 
    type: Date, 
    required: true,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
  collection: 'joins' // Explicit collection name
});

// Create indexes for better query performance
joinSchema.index({ guildId: 1, timestamp: -1 }); // For server-specific join history
joinSchema.index({ userId: 1, timestamp: -1 }); // For user join history
joinSchema.index({ timestamp: -1 }); // For recent joins query

// Create compound unique index to prevent duplicate joins
// This prevents the same user joining the same guild multiple times in a short period
joinSchema.index(
  { userId: 1, guildId: 1, timestamp: 1 }, 
  { unique: true, expireAfterSeconds: 300 } // Expires after 5 minutes
);

module.exports = mongoose.model('Join', joinSchema); 