/**
 * @fileoverview Command Configuration - Command System Settings
 * 
 * Configuration file for the Syro bot command system.
 * Defines default settings, categories, permissions, and system behavior.
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

/**
 * Command System Configuration
 */
const COMMAND_CONFIG = {
  // Default settings
  defaults: {
    prefix: 'x',
    enableCaching: true,
    cacheTTL: 300000, // 5 minutes
    enableValidation: true,
    enableStatistics: true,
    enableAuditLogging: true,
    maxAliases: 10,
    maxCooldowns: 1000,
    timeout: 30000, // 30 seconds
    maxRetries: 1
  },

  // Command categories
  categories: {
    admin: {
      name: 'Administration',
      description: 'Server administration commands',
      color: '#ff4444',
      icon: '⚙️',
      defaultPermissions: ['Administrator'],
      defaultCooldown: 10000
    },
    moderation: {
      name: 'Moderation',
      description: 'User moderation commands',
      color: '#ff8800',
      icon: '🛡️',
      defaultPermissions: ['ModerateMembers'],
      defaultCooldown: 5000
    },
    utility: {
      name: 'Utility',
      description: 'Utility and helper commands',
      color: '#00aa00',
      icon: '🔧',
      defaultPermissions: [],
      defaultCooldown: 3000
    },
    info: {
      name: 'Information',
      description: 'Information and status commands',
      color: '#0088ff',
      icon: 'ℹ️',
      defaultPermissions: [],
      defaultCooldown: 2000
    },
    fun: {
      name: 'Fun',
      description: 'Fun and entertainment commands',
      color: '#ff00ff',
      icon: '🎮',
      defaultPermissions: [],
      defaultCooldown: 5000
    },
    economy: {
      name: 'Economy',
      description: 'Economy and currency commands',
      color: '#ffdd00',
      icon: '💰',
      defaultPermissions: [],
      defaultCooldown: 10000
    },
    music: {
      name: 'Music',
      description: 'Music playback commands',
      color: '#ff0088',
      icon: '🎵',
      defaultPermissions: [],
      defaultCooldown: 3000
    }
  },

  // Default permissions for different command types
  permissions: {
    // Bot permissions required for different command categories
    botPermissions: {
      admin: [
        'ManageChannels',
        'ManageRoles',
        'ManageGuild',
        'BanMembers',
        'KickMembers',
        'ManageMessages'
      ],
      moderation: [
        'ModerateMembers',
        'ManageMessages',
        'KickMembers',
        'BanMembers'
      ],
      utility: [
        'SendMessages',
        'EmbedLinks',
        'AttachFiles'
      ],
      info: [
        'SendMessages',
        'EmbedLinks'
      ],
      fun: [
        'SendMessages',
        'EmbedLinks'
      ],
      economy: [
        'SendMessages',
        'EmbedLinks'
      ],
      music: [
        'SendMessages',
        'EmbedLinks',
        'Connect',
        'Speak'
      ]
    },

    // User permissions required for different command categories
    userPermissions: {
      admin: ['Administrator'],
      moderation: ['ModerateMembers'],
      utility: [],
      info: [],
      fun: [],
      economy: [],
      music: []
    }
  },

  // Cooldown settings
  cooldowns: {
    // Default cooldowns for different command categories (in milliseconds)
    defaults: {
      admin: 10000,      // 10 seconds
      moderation: 5000,  // 5 seconds
      utility: 3000,     // 3 seconds
      info: 2000,        // 2 seconds
      fun: 5000,         // 5 seconds
      economy: 10000,    // 10 seconds
      music: 3000        // 3 seconds
    },

    // Global cooldowns for specific commands (in milliseconds)
    global: {
      nuke: 60000,       // 1 minute
      purge: 30000,      // 30 seconds
      ban: 15000,        // 15 seconds
      kick: 10000,       // 10 seconds
      mute: 5000,        // 5 seconds
      warn: 3000         // 3 seconds
    }
  },

  // Command aliases
  aliases: {
    // Common aliases for commands
    avatar: ['av', 'profile'],
    userinfo: ['user', 'whois'],
    serverinfo: ['server', 'guild'],
    ban: ['banuser', 'banmember'],
    kick: ['kickuser', 'kickmember'],
    mute: ['timeout', 'silence'],
    unmute: ['untimeout', 'unsilence'],
    purge: ['clear', 'delete', 'prune'],
    nuke: ['clearall', 'deleteall'],
    help: ['commands', 'cmd', 'h'],
    ping: ['latency', 'pong'],
    stats: ['statistics', 'info']
  },

  // Error messages
  errors: {
    noPermission: '❌ You do not have permission to use this command.',
    botNoPermission: '❌ I do not have the required permissions to execute this command.',
    cooldown: '⏰ Please wait {time} seconds before using this command again.',
    invalidArgs: '❌ Invalid arguments provided. Use `{prefix}help {command}` for usage information.',
    commandNotFound: '❌ Command not found. Use `{prefix}help` to see available commands.',
    executionError: '❌ An error occurred while executing the command.',
    timeout: '⏰ Command execution timed out. Please try again.',
    rateLimit: '🚫 You are being rate limited. Please slow down.',
    maintenance: '🔧 This command is currently under maintenance. Please try again later.'
  },

  // Success messages
  success: {
    commandExecuted: '✅ Command executed successfully.',
    settingsUpdated: '✅ Settings updated successfully.',
    permissionGranted: '✅ Permission granted successfully.',
    permissionRemoved: '✅ Permission removed successfully.',
    cooldownSet: '⏰ Cooldown set successfully.',
    cooldownRemoved: '✅ Cooldown removed successfully.'
  },

  // Web dashboard integration
  dashboard: {
    // Commands to show in dashboard
    showInDashboard: [
      'avatar',
      'userinfo',
      'serverinfo',
      'ban',
      'kick',
      'mute',
      'unmute',
      'purge',
      'nuke',
      'help',
      'ping',
      'stats'
    ],

    // Commands to hide from dashboard
    hideFromDashboard: [
      'eval',
      'exec',
      'debug',
      'test'
    ],

    // Dashboard categories
    categories: {
      admin: {
        name: 'Administration',
        description: 'Server administration and management',
        icon: '⚙️',
        color: '#ff4444'
      },
      moderation: {
        name: 'Moderation',
        description: 'User moderation and management',
        icon: '🛡️',
        color: '#ff8800'
      },
      utility: {
        name: 'Utility',
        description: 'Useful tools and helpers',
        icon: '🔧',
        color: '#00aa00'
      },
      info: {
        name: 'Information',
        description: 'Server and user information',
        icon: 'ℹ️',
        color: '#0088ff'
      }
    }
  },

  // Performance settings
  performance: {
    // Cache settings
    cache: {
      enabled: true,
      ttl: 300000, // 5 minutes
      maxSize: 1000,
      cleanupInterval: 60000 // 1 minute
    },

    // Rate limiting
    rateLimit: {
      enabled: true,
      windowMs: 60000, // 1 minute
      maxRequests: 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    },

    // Monitoring
    monitoring: {
      enabled: true,
      logSlowCommands: true,
      slowCommandThreshold: 5000, // 5 seconds
      logErrors: true,
      logStats: true,
      statsInterval: 3600000 // 1 hour
    }
  },

  // Development settings
  development: {
    // Debug mode
    debug: process.env.NODE_ENV === 'development',
    
    // Hot reload
    hotReload: {
      enabled: false,
      watchPaths: ['./commands'],
      reloadDelay: 1000
    },

    // Testing
    testing: {
      enabled: false,
      mockCommands: false,
      testMode: false
    }
  }
};

module.exports = COMMAND_CONFIG; 