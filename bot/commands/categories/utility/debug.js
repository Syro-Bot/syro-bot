/**
 * @fileoverview Debug Command - List registered commands
 * 
 * Temporary debug command to list all registered commands.
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const TextCommand = require('../../templates/TextCommand');
const logger = require('../../../utils/logger');

/**
 * Debug Command Class
 * 
 * Lists all registered commands for debugging.
 * 
 * @class DebugCommand
 * @extends TextCommand
 */
class DebugCommand extends TextCommand {
  constructor() {
    super({
      name: 'debug',
      description: 'List all registered commands (debug)',
      category: 'utility',
      permissions: ['Administrator'],
      cooldown: 10000, // 10 seconds
      aliases: ['debugcommands', 'listcommands'],
      usage: 'debug',
      examples: [
        'debug'
      ],
      args: {},
      guildOnly: true,
      botPermissions: [],
      deleteAfter: false,
      embed: {
        color: '#ff8800'
      }
    });
  }

  /**
   * Execute the debug command
   * 
   * @param {Message} message - Discord message object
   * @param {Object} args - Parsed arguments
   * @returns {Promise<boolean>} Execution success status
   */
  async run(message, args) {
    try {
      const commandsSystem = require('../../index');
      
      // Get debug information
      const debugInfo = commandsSystem.debugCommands();
      
      // Create debug embed
      const debugEmbed = this.createEmbed({
        title: '🔍 Debug: Registered Commands',
        description: 'List of all registered commands in the system',
        color: '#ff8800',
        fields: [
          {
            name: '📝 New System Commands',
            value: debugInfo.newCommands.length > 0 ? 
              debugInfo.newCommands.map(cmd => `\`${cmd}\``).join(', ') : 
              'No commands registered',
            inline: false
          },
          {
            name: '🔄 Legacy Commands',
            value: debugInfo.legacyCommands.length > 0 ? 
              debugInfo.legacyCommands.map(cmd => `\`${cmd}\``).join(', ') : 
              'No legacy commands',
            inline: false
          },
          {
            name: '📊 Statistics',
            value: `**New Commands:** ${debugInfo.totalNew}\n**Legacy Commands:** ${debugInfo.totalLegacy}\n**Total:** ${debugInfo.totalNew + debugInfo.totalLegacy}`,
            inline: false
          }
        ],
        footer: { text: 'Debug information' }
      });

      await this.sendResponse(message, debugEmbed);
      
      return true;

    } catch (error) {
      logger.error(`❌ Error in debug command:`, error);
      
      await this.sendError(
        message, 
        'Debug Failed', 
        'An error occurred while getting debug information.'
      );
      
      return false;
    }
  }
}

module.exports = DebugCommand; 