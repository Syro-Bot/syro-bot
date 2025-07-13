/**
 * Bot Constants and Configuration
 * Centralized configuration for all bot settings
 */

// Cache size limits to prevent memory leaks
const CACHE_SIZE_LIMITS = {
  recentMessages: 1000,  // Max 1000 user message entries
  recentJoins: 500,      // Max 500 join entries
  recentChannels: 200,   // Max 200 channel entries
  recentRoles: 200,      // Max 200 role entries
  serverLockdowns: 100,  // Max 100 server lockdowns
  raidChannels: 100      // Max 100 raid channel entries
};

// Cache cleanup intervals (in milliseconds)
const CACHE_CLEANUP_INTERVALS = {
  recentMessages: 5 * 60 * 1000,    // 5 minutes
  recentJoins: 10 * 60 * 1000,      // 10 minutes
  recentChannels: 15 * 60 * 1000,   // 15 minutes
  recentRoles: 15 * 60 * 1000,      // 15 minutes
  serverLockdowns: 60 * 60 * 1000,  // 1 hour
  raidChannels: 30 * 60 * 1000      // 30 minutes
};

// Server configuration cache settings
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting for administrative commands
const COMMAND_COOLDOWNS = {
  '!unlock': 30000,    // 30 seconds
  '!cleanraid': 60000, // 1 minute
  '!raidstatus': 10000, // 10 seconds
  'xnuke': 300000,     // 5 minutes
  'xconfirmnuke': 30000 // 30 seconds
};

// Debouncing settings
const RAID_DEBOUNCE_DELAY = 5000; // 5 seconds

// Image generation limits
const IMAGE_LIMITS = {
  MAX_IMAGE_SIZE: 1024,    // Max 1024px
  MAX_CANVAS_SIZE: 1200,   // Max 1200px canvas
  MAX_FONT_SIZE: 72        // Max 72px font
};

// Lockdown settings
const LOCKDOWN_LIMITS = {
  MIN_DURATION: 1,         // 1 minute minimum
  MAX_DURATION: 1440       // 24 hours maximum
};

// Valid raid types
const VALID_RAID_TYPES = ['join', 'channel', 'role', 'general'];

// Required bot permissions for different operations
const REQUIRED_PERMISSIONS = {
  LOCKDOWN: [
    'ManageRoles',
    'ManageChannels',
    'SendMessages'
  ],
  MODERATION: [
    'ManageMessages',
    'KickMembers',
    'BanMembers'
  ],
  ADMIN_COMMANDS: [
    'Administrator'
  ]
};

// Database query projections for optimization
const DB_PROJECTIONS = {
  SERVER_CONFIG: {
    automodRules: 1,
    welcomeConfig: 1,
    joinRoles: 1,
    memberCountChannels: 1,
    globalAnnouncementChannels: 1
  }
};

module.exports = {
  CACHE_SIZE_LIMITS,
  CACHE_CLEANUP_INTERVALS,
  CONFIG_CACHE_TTL,
  COMMAND_COOLDOWNS,
  RAID_DEBOUNCE_DELAY,
  IMAGE_LIMITS,
  LOCKDOWN_LIMITS,
  VALID_RAID_TYPES,
  REQUIRED_PERMISSIONS,
  DB_PROJECTIONS
}; 