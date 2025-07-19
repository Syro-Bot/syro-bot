/**
 * @fileoverview Test Command - Simple test command
 * 
 * Simple test command to verify the new command system works.
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const TextCommand = require('../../templates/TextCommand');
const logger = require('../../../utils/logger');

/**
 * Test Command Class
 * 
 * Simple test command for debugging.
 * 
 * @class TestCommand
 * @extends TextCommand
 */
class TestCommand extends TextCommand {
  constructor() {
    super({
      name: 'test',
      description: 'Simple test command',
      category: 'utility',
      permissions: [],
      cooldown: 0,
      aliases: ['testcommand'],
      usage: 'test',
      examples: [
        'test'
      ],
      args: {},
      guildOnly: false,
      botPermissions: [],
      deleteAfter: false,
      embed: {
        color: '#00ff00'
      }
    });
  }

  /**
   * Execute the test command
   * 
   * @param {Message} message - Discord message object
   * @param {Object} args - Parsed arguments
   * @returns {Promise<boolean>} Execution success status
   */
  async run(message, args) {
    try {
      await this.sendSuccess(
        message,
        'Test Command Working!',
        '✅ The new command system is working correctly!\n\n**Command:** test\n**Category:** utility\n**User:** ' + message.author.tag
      );
      
      return true;

    } catch (error) {
      logger.error(`❌ Error in test command:`, error);
      
      await this.sendError(
        message, 
        'Test Failed', 
        'An error occurred while executing the test command.'
      );
      
      return false;
    }
  }
}

module.exports = TestCommand; 