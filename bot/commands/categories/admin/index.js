/**
 * @fileoverview Admin Commands Category - Index
 * 
 * Exports all administrative commands for the bot.
 * These commands require elevated permissions and are used for server management.
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const NukeCommand = require('./nuke');
const PurgeCommand = require('./purge');
const BanCommand = require('./ban');
const KickCommand = require('./kick');

/**
 * Admin Commands Category
 * 
 * Collection of administrative commands for server management.
 * All commands in this category require elevated permissions.
 * 
 * @type {Object}
 */
const AdminCommands = {
  // Channel Management
  nuke: new NukeCommand(),
  purge: new PurgeCommand(),
  
  // Member Management
  ban: new BanCommand(),
  kick: new KickCommand(),
  
  // Category metadata
  metadata: {
    name: 'admin',
    description: 'Administrative commands for server management',
    permissions: ['Administrator'],
    color: '#ff0000',
    icon: '🛡️'
  }
};

module.exports = AdminCommands; 