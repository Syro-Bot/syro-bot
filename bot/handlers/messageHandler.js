/**
 * @fileoverview Message Handler - Discord Message Event Processing
 * 
 * Handles all message-related events including spam detection, command processing,
 * and integration with the new command system.
 * 
 * Features:
 * - Spam detection and moderation
 * - Command processing with new command system
 * - Legacy command support for backward compatibility
 * - Comprehensive error handling and logging
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const { PermissionsBitField } = require('discord.js');
const cacheManager = require('../services/cacheManager');
const automodService = require('../services/automodService');
const adminCommands = require('../commands/adminCommands');
const { generateWelcomeImage } = require('../utils/imageGenerator');
const { handleError } = require('../utils/errorHandler');
const commandsSystem = require('../commands');
const logger = require('../utils/logger');

/**
 * Handle message create event
 * 
 * @param {Message} message - Discord message object
 */
async function handleMessageCreate(message) {
  if (message.author.bot) return;
  
  try {
    logger.info(`📨 Message received from ${message.author.tag} in ${message.guild.name}: "${message.content.substring(0, 50)}..."`);
    
    // Get server configuration with caching
    const config = await cacheManager.getServerConfig(message.guild.id);
    
    if (!config) {
      logger.warn(`⚠️ No config found for guild ${message.guild.name}`);
      return;
    }
    
    logger.debug(`⚙️ Config loaded for ${message.guild.name}:`, {
      hasAutomodRules: !!config.automodRules,
      hasSpamRules: !!(config.automodRules?.Spam),
      spamRulesCount: config.automodRules?.Spam?.length || 0
    });
    
    // ===== SPAM DETECTION =====
    await automodService.handleSpamDetection(message, config);
    
    // ===== COMMAND PROCESSING =====
    // Try new command system first
    const newCommandResult = await commandsSystem.executeCommand(message);
    
    if (newCommandResult) {
      // Command was handled by new system
      logger.debug(`✅ Command executed by new system: ${message.content.split(' ')[0]}`);
      return;
    }
    
    // Fallback to legacy command system for backward compatibility
    await handleLegacyCommands(message);
    
  } catch (error) {
    handleError(error, 'message handler');
  }
}

/**
 * Handle legacy commands for backward compatibility
 * 
 * @param {Message} message - Discord message object
 */
async function handleLegacyCommands(message) {
  try {
    // ===== ADMINISTRATIVE COMMANDS =====
    // Only process admin commands if user is administrator
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      // Handle avatar command (for everyone)
      if (message.content.startsWith('xavatar')) {
        await adminCommands.handleAvatarCommand(message);
      }
      return;
    }
    
    // Handle unlock command
    if (message.content === 'xunlock') {
      await adminCommands.handleUnlockCommand(message);
    }
    
    // Handle cleanraid command
    if (message.content === 'xcleanraid') {
      await adminCommands.handleCleanRaidCommand(message);
    }
    
    // Handle raidstatus command
    if (message.content === 'xraidstatus') {
      await adminCommands.handleRaidStatusCommand(message);
    }
    
    // Handle nuke command
    if (message.content === 'xnuke') {
      await adminCommands.handleNukeCommand(message);
    }
    
    // Handle permissions diagnostic command
    if (message.content === 'xperms') {
      await adminCommands.handlePermissionsCommand(message);
    }
    
    // Handle purge command
    if (message.content.startsWith('xpurge')) {
      await adminCommands.handlePurgeCommand(message);
    }
    
    // Handle avatar command (for everyone)
    if (message.content.startsWith('xavatar')) {
      await adminCommands.handleAvatarCommand(message);
    }
    
  } catch (error) {
    logger.error('❌ Error in legacy command handling:', error);
    handleError(error, 'legacy command handler');
  }
}

/**
 * Register legacy commands with the new command system
 * This function can be called to migrate legacy commands to the new system
 */
async function registerLegacyCommands() {
  try {
    logger.info('🔄 Registering legacy commands with new command system...');
    
    // Register avatar command
    commandsSystem.registerCommand({
      name: 'avatar',
      description: 'Get user avatar',
      category: 'utility',
      permissions: [],
      cooldown: 5000, // 5 seconds
      aliases: ['av'],
      execute: async (message, args) => {
        await adminCommands.handleAvatarCommand(message);
        return true;
      }
    });
    
    // Register unlock command
    commandsSystem.registerCommand({
      name: 'unlock',
      description: 'Unlock all channels',
      category: 'admin',
      permissions: ['Administrator'],
      cooldown: 10000, // 10 seconds
      aliases: [],
      execute: async (message, args) => {
        await adminCommands.handleUnlockCommand(message);
        return true;
      }
    });
    
    // Register nuke command
    commandsSystem.registerCommand({
      name: 'nuke',
      description: 'Delete all messages in channel',
      category: 'admin',
      permissions: ['Administrator'],
      cooldown: 30000, // 30 seconds
      aliases: [],
      execute: async (message, args) => {
        await adminCommands.handleNukeCommand(message);
        return true;
      }
    });
    
    // Register purge command
    commandsSystem.registerCommand({
      name: 'purge',
      description: 'Delete specified number of messages',
      category: 'admin',
      permissions: ['Administrator'],
      cooldown: 15000, // 15 seconds
      aliases: ['clear'],
      execute: async (message, args) => {
        await adminCommands.handlePurgeCommand(message);
        return true;
      }
    });
    
    // Register cleanraid command
    commandsSystem.registerCommand({
      name: 'cleanraid',
      description: 'Clean raid messages',
      category: 'admin',
      permissions: ['Administrator'],
      cooldown: 20000, // 20 seconds
      aliases: ['raidclean'],
      execute: async (message, args) => {
        await adminCommands.handleCleanRaidCommand(message);
        return true;
      }
    });
    
    // Register raidstatus command
    commandsSystem.registerCommand({
      name: 'raidstatus',
      description: 'Check raid status',
      category: 'admin',
      permissions: ['Administrator'],
      cooldown: 5000, // 5 seconds
      aliases: ['raid'],
      execute: async (message, args) => {
        await adminCommands.handleRaidStatusCommand(message);
        return true;
      }
    });
    
    // Register permissions command
    commandsSystem.registerCommand({
      name: 'perms',
      description: 'Check bot permissions',
      category: 'admin',
      permissions: ['Administrator'],
      cooldown: 10000, // 10 seconds
      aliases: ['permissions'],
      execute: async (message, args) => {
        await adminCommands.handlePermissionsCommand(message);
        return true;
      }
    });
    
    logger.info('✅ Legacy commands registered successfully');
    
  } catch (error) {
    logger.error('❌ Error registering legacy commands:', error);
  }
}

/**
 * Get command system statistics
 * 
 * @returns {Object} Command system statistics
 */
function getCommandStats() {
  return commandsSystem.getStats();
}

/**
 * Get command system health status
 * 
 * @returns {Object} Health status
 */
function getCommandHealth() {
  return commandsSystem.getHealthStatus();
}

module.exports = {
  handleMessageCreate,
  registerLegacyCommands,
  getCommandStats,
  getCommandHealth
}; 