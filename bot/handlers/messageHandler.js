/**
 * Message Handler
 * Handles all message-related events including spam detection and commands
 */

const { PermissionsBitField } = require('discord.js');
const cacheManager = require('../services/cacheManager');
const automodService = require('../services/automodService');
const adminCommands = require('../commands/adminCommands');
const { generateWelcomeImage } = require('../utils/imageGenerator');
const { handleError } = require('../utils/errorHandler');

/**
 * Handle message create event
 * @param {Message} message - Discord message object
 */
async function handleMessageCreate(message) {
  if (message.author.bot) return;
  
  try {
    console.log(`📨 Message received from ${message.author.tag} in ${message.guild.name}: "${message.content.substring(0, 50)}..."`);
    
    // Get server configuration with caching
    const config = await cacheManager.getServerConfig(message.guild.id);
    
    if (!config) {
      console.log(`⚠️ No config found for guild ${message.guild.name}`);
      return;
    }
    
    console.log(`⚙️ Config loaded for ${message.guild.name}:`, {
      hasAutomodRules: !!config.automodRules,
      hasSpamRules: !!(config.automodRules?.Spam),
      spamRulesCount: config.automodRules?.Spam?.length || 0
    });
    
    // ===== SPAM DETECTION =====
    await automodService.handleSpamDetection(message, config);
    
    // ===== ADMINISTRATIVE COMMANDS =====
    // Solo procesar comandos si el usuario es administrador
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
    
    // Handle avatar command (for everyone)
    if (message.content.startsWith('xavatar')) {
      await adminCommands.handleAvatarCommand(message);
    }
    
  } catch (error) {
    handleError(error, 'message handler');
  }
}

module.exports = {
  handleMessageCreate
}; 