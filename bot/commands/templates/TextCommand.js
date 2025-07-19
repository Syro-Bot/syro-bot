/**
 * @fileoverview Text Command - Text Command Template
 * 
 * Template for text-based Discord commands. Extends BaseCommand
 * and provides additional functionality specific to text commands.
 * 
 * Features:
 * - Text command specific validation
 * - Message formatting utilities
 * - Embed creation helpers
 * - Response management
 * - Text processing utilities
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const BaseCommand = require('./BaseCommand');
const { EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');

/**
 * Text Command Class
 * 
 * Template for text-based Discord commands.
 * Extends BaseCommand with text-specific functionality.
 * 
 * @class TextCommand
 * @extends BaseCommand
 */
class TextCommand extends BaseCommand {
  /**
   * Initialize the text command
   * 
   * @param {Object} config - Command configuration
   * @param {string} config.name - Command name
   * @param {string} config.description - Command description
   * @param {string} config.category - Command category
   * @param {Array} config.permissions - Required permissions
   * @param {number} config.cooldown - Cooldown in milliseconds
   * @param {Array} config.aliases - Command aliases
   * @param {string} config.usage - Usage example
   * @param {Array} config.examples - Usage examples
   * @param {Object} config.args - Argument definitions
   * @param {boolean} config.guildOnly - Whether command is guild-only
   * @param {boolean} config.dmOnly - Whether command is DM-only
   * @param {Array} config.botPermissions - Required bot permissions
   * @param {boolean} config.deleteAfter - Whether to delete command message after execution
   * @param {boolean} config.ephemeral - Whether response should be ephemeral
   * @param {Object} config.embed - Default embed configuration
   */
  constructor(config) {
    super(config);
    
    // Text command specific properties
    this.deleteAfter = config.deleteAfter || false;
    this.ephemeral = config.ephemeral || false;
    this.embed = config.embed || {};
    
    logger.debug(`📝 Text command initialized: ${this.name}`);
  }

  /**
   * Create a basic embed
   * 
   * @param {Object} options - Embed options
   * @param {string} options.title - Embed title
   * @param {string} options.description - Embed description
   * @param {string} options.color - Embed color
   * @param {string} options.footer - Embed footer
   * @param {string} options.thumbnail - Embed thumbnail URL
   * @param {Array} options.fields - Embed fields
   * @returns {EmbedBuilder} Discord embed
   */
  createEmbed(options = {}) {
    const embed = new EmbedBuilder();
    
    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.color) embed.setColor(options.color);
    if (options.footer) {
      if (typeof options.footer === 'string') {
        embed.setFooter({ text: options.footer });
      } else if (typeof options.footer === 'object' && options.footer.text) {
        embed.setFooter(options.footer);
      }
    }
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.image) embed.setImage(options.image.url);
    if (options.fields) embed.addFields(options.fields);
    
    // Set default timestamp
    embed.setTimestamp();
    
    return embed;
  }

  /**
   * Create a success embed
   * 
   * @param {string} title - Embed title
   * @param {string} description - Embed description
   * @param {Object} options - Additional options
   * @returns {EmbedBuilder} Success embed
   */
  createSuccessEmbed(title, description, options = {}) {
    return this.createEmbed({
      title: `✅ ${title}`,
      description,
      color: '#00ff00',
      ...options
    });
  }

  /**
   * Create an error embed
   * 
   * @param {string} title - Embed title
   * @param {string} description - Embed description
   * @param {Object} options - Additional options
   * @returns {EmbedBuilder} Error embed
   */
  createErrorEmbed(title, description, options = {}) {
    return this.createEmbed({
      title: `❌ ${title}`,
      description,
      color: '#ff0000',
      ...options
    });
  }

  /**
   * Create an info embed
   * 
   * @param {string} title - Embed title
   * @param {string} description - Embed description
   * @param {Object} options - Additional options
   * @returns {EmbedBuilder} Info embed
   */
  createInfoEmbed(title, description, options = {}) {
    return this.createEmbed({
      title: `ℹ️ ${title}`,
      description,
      color: '#0099ff',
      ...options
    });
  }

  /**
   * Create a warning embed
   * 
   * @param {string} title - Embed title
   * @param {string} description - Embed description
   * @param {Object} options - Additional options
   * @returns {EmbedBuilder} Warning embed
   */
  createWarningEmbed(title, description, options = {}) {
    return this.createEmbed({
      title: `⚠️ ${title}`,
      description,
      color: '#ffaa00',
      ...options
    });
  }

  /**
   * Send a response to the user
   * 
   * @param {Message} message - Discord message object
   * @param {string|EmbedBuilder} content - Response content
   * @param {Object} options - Response options
   * @returns {Promise<Message>} Sent message
   */
  async sendResponse(message, content, options = {}) {
    try {
      const response = await message.reply({
        content: typeof content === 'string' ? content : null,
        embeds: content instanceof EmbedBuilder ? [content] : [],
        ...options
      });
      
      // Delete command message if configured
      if (this.deleteAfter && message.guild) {
        setTimeout(() => {
          message.delete().catch(() => {});
        }, 5000); // Delete after 5 seconds
      }
      
      return response;
    } catch (error) {
      logger.error(`❌ Failed to send response for command ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Send a success response
   * 
   * @param {Message} message - Discord message object
   * @param {string} title - Success title
   * @param {string} description - Success description
   * @param {Object} options - Additional options
   * @returns {Promise<Message>} Sent message
   */
  async sendSuccess(message, title, description, options = {}) {
    const embed = this.createSuccessEmbed(title, description, options);
    return await this.sendResponse(message, embed);
  }

  /**
   * Send an error response
   * 
   * @param {Message} message - Discord message object
   * @param {string} title - Error title
   * @param {string} description - Error description
   * @param {Object} options - Additional options
   * @returns {Promise<Message>} Sent message
   */
  async sendError(message, title, description, options = {}) {
    const embed = this.createErrorEmbed(title, description, options);
    return await this.sendResponse(message, embed);
  }

  /**
   * Send an info response
   * 
   * @param {Message} message - Discord message object
   * @param {string} title - Info title
   * @param {string} description - Info description
   * @param {Object} options - Additional options
   * @returns {Promise<Message>} Sent message
   */
  async sendInfo(message, title, description, options = {}) {
    const embed = this.createInfoEmbed(title, description, options);
    return await this.sendResponse(message, embed);
  }

  /**
   * Send a warning response
   * 
   * @param {Message} message - Discord message object
   * @param {string} title - Warning title
   * @param {string} description - Warning description
   * @param {Object} options - Additional options
   * @returns {Promise<Message>} Sent message
   */
  async sendWarning(message, title, description, options = {}) {
    const embed = this.createWarningEmbed(title, description, options);
    return await this.sendResponse(message, embed);
  }

  /**
   * Format a duration in milliseconds to human readable format
   * 
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Format a number with commas
   * 
   * @param {number} num - Number to format
   * @returns {string} Formatted number
   */
  formatNumber(num) {
    return num.toLocaleString();
  }

  /**
   * Truncate text to specified length
   * 
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @param {string} suffix - Suffix to add if truncated
   * @returns {string} Truncated text
   */
  truncateText(text, maxLength, suffix = '...') {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Escape markdown characters
   * 
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeMarkdown(text) {
    return text.replace(/[\\*_`~|]/g, '\\$&');
  }

  /**
   * Get user mention from ID or mention
   * 
   * @param {string} input - User ID or mention
   * @returns {string} User mention
   */
  getUserMention(input) {
    const userId = input.replace(/[<@!>]/g, '');
    return `<@${userId}>`;
  }

  /**
   * Get channel mention from ID or mention
   * 
   * @param {string} input - Channel ID or mention
   * @returns {string} Channel mention
   */
  getChannelMention(input) {
    const channelId = input.replace(/[<#>]/g, '');
    return `<#${channelId}>`;
  }

  /**
   * Get role mention from ID or mention
   * 
   * @param {string} input - Role ID or mention
   * @returns {string} Role mention
   */
  getRoleMention(input) {
    const roleId = input.replace(/[<@&>]/g, '');
    return `<@&${roleId}>`;
  }

  /**
   * Check if user has permission in channel
   * 
   * @param {GuildMember} member - Guild member
   * @param {TextChannel} channel - Text channel
   * @param {string} permission - Permission to check
   * @returns {boolean} Permission status
   */
  hasChannelPermission(member, channel, permission) {
    return member.permissionsIn(channel).has(permission);
  }

  /**
   * Get user's highest role
   * 
   * @param {GuildMember} member - Guild member
   * @returns {Role|null} Highest role
   */
  getHighestRole(member) {
    return member.roles.highest;
  }

  /**
   * Check if user can manage target user
   * 
   * @param {GuildMember} executor - Executing member
   * @param {GuildMember} target - Target member
   * @returns {boolean} Can manage status
   */
  canManageUser(executor, target) {
    // Bot owner can manage anyone
    if (executor.id === process.env.BOT_OWNER_ID) return true;
    
    // Users can't manage themselves
    if (executor.id === target.id) return false;
    
    // Check role hierarchy
    return executor.roles.highest.position > target.roles.highest.position;
  }

  /**
   * Validate user mention or ID
   * 
   * @param {string} input - User input
   * @param {Guild} guild - Discord guild
   * @returns {GuildMember|null} Guild member or null
   */
  async validateUser(input, guild) {
    if (!input) return null;
    
    const userId = input.replace(/[<@!>]/g, '');
    
    try {
      const member = await guild.members.fetch(userId);
      return member;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate channel mention or ID
   * 
   * @param {string} input - Channel input
   * @param {Guild} guild - Discord guild
   * @returns {TextChannel|null} Text channel or null
   */
  validateChannel(input, guild) {
    if (!input) return null;
    
    const channelId = input.replace(/[<#>]/g, '');
    
    try {
      const channel = guild.channels.cache.get(channelId);
      return channel && channel.type === 0 ? channel : null; // 0 = GUILD_TEXT
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate role mention or ID
   * 
   * @param {string} input - Role input
   * @param {Guild} guild - Discord guild
   * @returns {Role|null} Role or null
   */
  validateRole(input, guild) {
    if (!input) return null;
    
    const roleId = input.replace(/[<@&>]/g, '');
    
    try {
      const role = guild.roles.cache.get(roleId);
      return role;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get command usage with prefix
   * 
   * @param {string} prefix - Command prefix
   * @returns {string} Full command usage
   */
  getFullUsage(prefix) {
    return `${prefix}${this._generateUsageText()}`;
  }

  /**
   * Get command examples with prefix
   * 
   * @param {string} prefix - Command prefix
   * @returns {Array} Command examples with prefix
   */
  getFullExamples(prefix) {
    return this.examples.map(example => `${prefix}${example}`);
  }
}

module.exports = TextCommand; 