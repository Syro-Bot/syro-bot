/**
 * @fileoverview Utility Commands Category - Index
 * 
 * Exports all utility commands for the bot.
 * These commands provide useful information and tools for users.
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const PingCommand = require('./ping');
const UserInfoCommand = require('./userinfo');
const DebugCommand = require('./debug');
const TestCommand = require('./test');

/**
 * Utility Commands Category
 * 
 * Collection of utility commands for general use.
 * These commands provide useful information and tools.
 * 
 * @type {Object}
 */
const UtilityCommands = {
  // Bot Information
  ping: new PingCommand(),
  
  // User Information
  userinfo: new UserInfoCommand(),
  
  // Debug
  debug: new DebugCommand(),
  
  // Test
  test: new TestCommand(),
  
  // Category metadata
  metadata: {
    name: 'utility',
    description: 'Utility commands for general use',
    permissions: [],
    color: '#0099ff',
    icon: '🔧'
  }
};

module.exports = UtilityCommands; 