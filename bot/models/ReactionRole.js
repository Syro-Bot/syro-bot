/**
 * Reaction Role Model
 * 
 * Stores configuration for reaction role messages in Discord servers.
 * Each reaction role message can have multiple emoji-role pairs that users
 * can react to in order to receive or remove roles automatically.
 * 
 * @author Syro Development Team
 * @version 1.0.0
 * @since 2024
 */

const mongoose = require('mongoose');

/**
 * Schema for individual emoji-role pair configuration
 */
const emojiRoleSchema = new mongoose.Schema({
  /**
   * Unique identifier for this emoji-role pair
   */
  id: {
    type: String,
    required: true
  },
  
  /**
   * Emoji identifier (custom emoji ID or Unicode emoji)
   */
  emoji: {
    type: String,
    required: true,
    trim: true
  },
  
  /**
   * Role configuration
   */
  role: {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    color: {
      type: String,
      required: true
    },
    position: {
      type: Number,
      required: true
    }
  },
  
  /**
   * Whether this role should be removed when reaction is removed
   */
  removeOnReactionRemove: {
    type: Boolean,
    default: true
  },
  
  /**
   * Custom description for this emoji-role pair
   */
  description: {
    type: String,
    trim: true,
    maxlength: 100
  }
}, { _id: false });

/**
 * Schema for reaction role message configuration
 */
const reactionRoleSchema = new mongoose.Schema({
  /**
   * Discord Server ID where this reaction role is configured
   */
  serverId: {
    type: String,
    required: true,
    index: true
  },
  
  /**
   * Discord Channel ID where the message will be sent
   */
  channelId: {
    type: String,
    required: true
  },
  
  /**
   * Discord Message ID (set after message is sent)
   */
  messageId: {
    type: String,
    sparse: true,
    index: true
  },
  
  /**
   * Message title/name for identification
   */
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  /**
   * Message content (plain text)
   */
  content: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  
  /**
   * Embed configuration for rich message display
   */
  embed: {
    title: {
      type: String,
      trim: true,
      maxlength: 256
    },
    description: {
      type: String,
      trim: true,
      maxlength: 4096
    },
    color: {
      type: String,
      default: '#7289da'
    },
    imageUrl: {
      type: String,
      trim: true
    },
    thumbnailUrl: {
      type: String,
      trim: true
    },
    author: {
      name: {
        type: String,
        trim: true,
        maxlength: 256
      },
      iconUrl: {
        type: String,
        trim: true
      }
    },
    footer: {
      text: {
        type: String,
        trim: true,
        maxlength: 2048
      },
      iconUrl: {
        type: String,
        trim: true
      }
    }
  },
  
  /**
   * Array of emoji-role pairs for this message
   */
  emojiRoles: {
    type: [emojiRoleSchema],
    validate: {
      validator: function(emojiRoles) {
        // Ensure maximum of 20 emoji-role pairs (Discord limit)
        return emojiRoles.length <= 20;
      },
      message: 'Cannot have more than 20 emoji-role pairs per message'
    }
  },
  
  /**
   * Whether this reaction role message is currently active
   */
  isActive: {
    type: Boolean,
    default: true
  },
  
  /**
   * Whether to show role descriptions in the embed
   */
  showRoleDescriptions: {
    type: Boolean,
    default: true
  },
  
  /**
   * Whether to allow users to have multiple roles from this message
   */
  allowMultipleRoles: {
    type: Boolean,
    default: false
  },
  
  /**
   * Maximum number of roles a user can have from this message
   */
  maxRolesPerUser: {
    type: Number,
    min: 1,
    max: 20,
    default: 1
  },
  
  /**
   * Cooldown period between role changes (in seconds)
   */
  cooldownSeconds: {
    type: Number,
    min: 0,
    max: 3600,
    default: 5
  },
  
  /**
   * Whether to log role assignments/removals
   */
  enableLogging: {
    type: Boolean,
    default: true
  },
  
  /**
   * Channel ID for logging role changes (optional)
   */
  logChannelId: {
    type: String,
    sparse: true
  },
  
  /**
   * Created by user ID
   */
  createdBy: {
    type: String,
    required: true
  },
  
  /**
   * Last updated by user ID
   */
  updatedBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
  collection: 'reaction_roles' // Explicit collection name
});

// Create indexes for better query performance
reactionRoleSchema.index({ serverId: 1, isActive: 1 });
reactionRoleSchema.index({ messageId: 1 });
reactionRoleSchema.index({ 'emojiRoles.emoji': 1 });
reactionRoleSchema.index({ 'emojiRoles.role.id': 1 });

/**
 * Pre-save middleware to validate emoji-role pairs
 */
reactionRoleSchema.pre('save', function(next) {
  if (this.emojiRoles && this.emojiRoles.length > 0) {
    // Ensure unique emojis
    const emojis = this.emojiRoles.map(er => er.emoji);
    const uniqueEmojis = new Set(emojis);
    
    if (emojis.length !== uniqueEmojis.size) {
      return next(new Error('Duplicate emojis are not allowed'));
    }
    
    // Ensure unique roles
    const roleIds = this.emojiRoles.map(er => er.role.id);
    const uniqueRoleIds = new Set(roleIds);
    
    if (roleIds.length !== uniqueRoleIds.size) {
      return next(new Error('Duplicate roles are not allowed'));
    }
  }
  
  next();
});

/**
 * Static method to find active reaction roles by server
 */
reactionRoleSchema.statics.findActiveByServer = function(serverId) {
  return this.find({ serverId, isActive: true }).sort({ createdAt: -1 });
};

/**
 * Static method to find reaction role by message ID
 */
reactionRoleSchema.statics.findByMessageId = function(messageId) {
  return this.findOne({ messageId, isActive: true });
};

/**
 * Instance method to get emoji-role mapping
 */
reactionRoleSchema.methods.getEmojiRoleMap = function() {
  const map = new Map();
  this.emojiRoles.forEach(emojiRole => {
    map.set(emojiRole.emoji, emojiRole.role);
  });
  return map;
};

/**
 * Instance method to check if user can have more roles
 */
reactionRoleSchema.methods.canUserHaveMoreRoles = function(currentRoleCount) {
  if (this.allowMultipleRoles) {
    return currentRoleCount < this.maxRolesPerUser;
  }
  return currentRoleCount === 0;
};

module.exports = mongoose.model('ReactionRole', reactionRoleSchema); 