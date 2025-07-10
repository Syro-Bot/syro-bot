/**
 * Welcome Configuration Model
 * 
 * This model stores the welcome message configuration for each Discord server.
 * It contains channel settings, message content, image configurations, and other welcome-related settings.
 * 
 * @author Syro Development Team
 * @version 1.0.0
 */

const mongoose = require('mongoose');

/**
 * Schema for welcome message configuration
 * Stores all welcome-related settings for each Discord server
 */
const welcomeConfigSchema = new mongoose.Schema({
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
   * Discord Channel ID
   * The channel where welcome messages will be sent
   * Required for sending welcome messages
   */
  channelId: {
    type: String,
    required: true,
    trim: true
  },
  
  /**
   * Custom Welcome Message
   * The text message to send with the welcome image
   * Optional - if not provided, only the image will be sent
   */
  customMessage: {
    type: String,
    trim: true,
    maxlength: 2000 // Discord message limit
  },
  
  /**
   * Mention User
   * Whether to mention the new user in the welcome message
   * Default: true
   */
  mentionUser: {
    type: Boolean,
    default: true
  },
  
  /**
   * Background Image Configuration
   * Settings for the welcome image background
   */
  backgroundImage: {
    /**
     * Background Image URL or Base64
     * The image to use as background for welcome cards
     */
    url: {
      type: String,
      trim: true
    },
    
    /**
     * Background Color
     * Fallback color if no image is provided
     * Default: #2f3136 (Discord dark theme)
     */
    color: {
      type: String,
      default: '#2f3136',
      trim: true
    },
    
    /**
     * Background Opacity
     * Opacity of the background image (0-1)
     * Default: 1 (fully opaque)
     */
    opacity: {
      type: Number,
      min: 0,
      max: 1,
      default: 1
    }
  },
  
  /**
   * Text Configuration
   * Settings for the text overlay on welcome images
   */
  textConfig: {
    /**
     * Welcome Text
     * The main text to display on the welcome image
     * Default: "Welcome to the server!"
     */
    welcomeText: {
      type: String,
      default: 'Welcome to the server!',
      trim: true,
      maxlength: 100
    },
    
    /**
     * Username Text
     * Text to display before the username
     * Default: "Welcome,"
     */
    usernameText: {
      type: String,
      default: 'Welcome,',
      trim: true,
      maxlength: 50
    },
    
    /**
     * Text Color
     * Color of the text on the welcome image
     * Default: #ffffff (white)
     */
    color: {
      type: String,
      default: '#ffffff',
      trim: true
    },
    
    /**
     * Text Size
     * Size of the main welcome text
     * Default: 48
     */
    size: {
      type: Number,
      min: 12,
      max: 120,
      default: 48
    },
    
    /**
     * Username Text Size
     * Size of the username text
     * Default: 32
     */
    usernameSize: {
      type: Number,
      min: 12,
      max: 80,
      default: 32
    }
  },
  
  /**
   * Avatar Configuration
   * Settings for the user avatar on welcome images
   */
  avatarConfig: {
    /**
     * Show Avatar
     * Whether to show the user's avatar on the welcome image
     * Default: true
     */
    show: {
      type: Boolean,
      default: true
    },
    
    /**
     * Avatar Size
     * Size of the avatar in pixels
     * Default: 128
     */
    size: {
      type: Number,
      min: 32,
      max: 256,
      default: 128
    },
    
    /**
     * Avatar Border
     * Whether to show a border around the avatar
     * Default: true
     */
    border: {
      type: Boolean,
      default: true
    },
    
    /**
     * Border Color
     * Color of the avatar border
     * Default: #7289da (Discord blurple)
     */
    borderColor: {
      type: String,
      default: '#7289da',
      trim: true
    },
    
    /**
     * Border Width
     * Width of the avatar border in pixels
     * Default: 4
     */
    borderWidth: {
      type: Number,
      min: 0,
      max: 20,
      default: 4
    }
  },
  
  /**
   * Welcome Statistics
   * Track welcome message statistics
   */
  stats: {
    /**
     * Total Welcome Messages Sent
     * Counter for total welcome messages sent
     * Default: 0
     */
    totalSent: {
      type: Number,
      default: 0,
      min: 0
    },
    
    /**
     * Last Welcome Sent
     * Timestamp of the last welcome message sent
     */
    lastSent: {
      type: Date
    }
  },
  
  /**
   * Enabled Status
   * Whether welcome messages are enabled for this server
   * Default: true
   */
  enabled: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true, // Adds createdAt and updatedAt fields
  collection: 'welcome_configs' // Explicit collection name
});

// Create indexes for better query performance
welcomeConfigSchema.index({ serverId: 1 });
welcomeConfigSchema.index({ enabled: 1 });
welcomeConfigSchema.index({ 'stats.lastSent': -1 });

module.exports = mongoose.model('WelcomeConfig', welcomeConfigSchema); 