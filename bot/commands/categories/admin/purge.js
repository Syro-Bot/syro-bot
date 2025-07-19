/**
 * @fileoverview Purge Command - Bulk delete messages
 * 
 * Administrative command to bulk delete messages in a channel.
 * Supports filtering by user, content, and message type.
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const TextCommand = require('../../templates/TextCommand');
const { PermissionsBitField } = require('discord.js');

/**
 * Purge Command Class
 * 
 * Bulk deletes messages in a channel with various filters.
 * 
 * @class PurgeCommand
 * @extends TextCommand
 */
class PurgeCommand extends TextCommand {
  constructor() {
    super({
      name: 'purge',
      description: 'Bulk delete messages in the current channel',
      category: 'admin',
      permissions: ['ManageMessages'],
      cooldown: 30000, // 30 seconds
      aliases: ['clear', 'bulkdelete', 'prune'],
      usage: 'purge <amount> [user] [type] [content]',
      examples: [
        'purge 10',
        'purge 50 @user',
        'purge 20 bot',
        'purge 15 @user bot',
        'purge 25 @user text spam'
      ],
      args: {
        amount: {
          index: 0,
          type: 'integer',
          required: true,
          min: 1,
          max: 100,
          description: 'Number of messages to delete (1-100)'
        },
        user: {
          index: 1,
          type: 'user',
          required: false,
          description: 'User to filter messages by'
        },
        type: {
          index: 2,
          type: 'string',
          required: false,
          validate: (value) => ['bot', 'user', 'text', 'image', 'video', 'file', 'embed'].includes(value.toLowerCase()),
          description: 'Message type filter (bot, user, text, image, video, file, embed)'
        },
        content: {
          index: 3,
          type: 'string',
          required: false,
          description: 'Content to filter messages by'
        }
      },
      guildOnly: true,
      botPermissions: ['ManageMessages'],
      deleteAfter: true,
      embed: {
        color: '#ff8800'
      }
    });
  }

  /**
   * Execute the purge command
   * 
   * @param {Message} message - Discord message object
   * @param {Object} args - Parsed arguments
   * @returns {Promise<boolean>} Execution success status
   */
  async run(message, args) {
    const { amount, user, type, content } = args;
    const channel = message.channel;
    const guild = message.guild;
    const executor = message.member;

    try {
      // Check if user has permission to manage messages
      if (!this.hasChannelPermission(executor, channel, 'ManageMessages')) {
        await this.sendError(message, 'Permission Denied', 'You do not have permission to manage messages in this channel.');
        return false;
      }

      // Check if bot has permission to manage messages
      if (!this.botHasPermissions(guild)) {
        await this.sendError(message, 'Bot Permission Error', 'I do not have permission to manage messages.');
        return false;
      }

      // Validate amount
      if (amount < 1 || amount > 100) {
        await this.sendError(message, 'Invalid Amount', 'Please specify a number between 1 and 100.');
        return false;
      }

      // Send processing message
      const processingEmbed = this.createInfoEmbed(
        'Processing Purge',
        `Searching for messages to delete...\n\n**Amount:** ${amount}\n**Channel:** ${channel.name}`,
        {
          fields: [
            { name: 'Status', value: '🔍 Searching...', inline: true },
            { name: 'Executor', value: executor.user.tag, inline: true },
            { name: 'Filters', value: this._getFilterText(user, type, content), inline: true }
          ]
        }
      );

      const processingMessage = await this.sendResponse(message, processingEmbed);

      // Fetch messages
      const messages = await this._fetchMessages(channel, amount, user, type, content);

      if (messages.length === 0) {
        await this.sendWarning(message, 'No Messages Found', 'No messages found matching the specified criteria.');
        return true;
      }

      // Delete messages
      const deletedCount = await this._deleteMessages(channel, messages);

      // Send success message
      const successEmbed = this.createSuccessEmbed(
        'Messages Purged Successfully',
        `Successfully deleted **${deletedCount}** messages from ${channel.name}.`,
        {
          fields: [
            { name: 'Deleted', value: deletedCount.toString(), inline: true },
            { name: 'Channel', value: channel.name, inline: true },
            { name: 'Executor', value: executor.user.tag, inline: true },
            { name: 'Filters Applied', value: this._getFilterText(user, type, content), inline: false },
            { name: 'Timestamp', value: new Date().toLocaleString(), inline: false }
          ],
          footer: { text: 'Message purge completed' }
        }
      );

      await this.sendResponse(message, successEmbed);

      // Log the action
      this._logPurgeAction(guild, executor, channel, deletedCount, user, type, content);

      return true;

    } catch (error) {
      logger.error(`❌ Error in purge command:`, error);
      
      await this.sendError(
        message, 
        'Purge Failed', 
        'An error occurred while purging messages. Please try again or contact an administrator.'
      );
      
      return false;
    }
  }

  /**
   * Fetch messages based on filters
   * 
   * @param {TextChannel} channel - Text channel
   * @param {number} amount - Number of messages to fetch
   * @param {string} userId - User ID filter
   * @param {string} type - Message type filter
   * @param {string} content - Content filter
   * @returns {Promise<Array>} Filtered messages
   * @private
   */
  async _fetchMessages(channel, amount, userId, type, content) {
    const messages = [];
    let lastId = null;
    const maxIterations = Math.ceil(amount / 100) + 5; // Extra iterations for filtering
    let iterations = 0;

    while (messages.length < amount && iterations < maxIterations) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const batch = await channel.messages.fetch(options);
      if (batch.size === 0) break;

      for (const [id, msg] of batch) {
        if (messages.length >= amount) break;

        // Apply filters
        if (this._messageMatchesFilters(msg, userId, type, content)) {
          messages.push(msg);
        }

        lastId = id;
      }

      iterations++;
    }

    return messages;
  }

  /**
   * Check if message matches filters
   * 
   * @param {Message} message - Discord message
   * @param {string} userId - User ID filter
   * @param {string} type - Message type filter
   * @param {string} content - Content filter
   * @returns {boolean} Whether message matches filters
   * @private
   */
  _messageMatchesFilters(message, userId, type, content) {
    // User filter
    if (userId && message.author.id !== userId) {
      return false;
    }

    // Type filter
    if (type) {
      const typeLower = type.toLowerCase();
      
      switch (typeLower) {
        case 'bot':
          if (!message.author.bot) return false;
          break;
        case 'user':
          if (message.author.bot) return false;
          break;
        case 'text':
          if (message.content.length === 0) return false;
          break;
        case 'image':
          if (message.attachments.size === 0 || !message.attachments.some(a => a.contentType?.startsWith('image/'))) return false;
          break;
        case 'video':
          if (message.attachments.size === 0 || !message.attachments.some(a => a.contentType?.startsWith('video/'))) return false;
          break;
        case 'file':
          if (message.attachments.size === 0) return false;
          break;
        case 'embed':
          if (message.embeds.length === 0) return false;
          break;
      }
    }

    // Content filter
    if (content && !message.content.toLowerCase().includes(content.toLowerCase())) {
      return false;
    }

    return true;
  }

  /**
   * Delete messages in batches
   * 
   * @param {TextChannel} channel - Text channel
   * @param {Array} messages - Messages to delete
   * @returns {Promise<number>} Number of deleted messages
   * @private
   */
  async _deleteMessages(channel, messages) {
    let deletedCount = 0;
    const batchSize = 100;

    // Delete messages older than 14 days in bulk
    const oldMessages = messages.filter(msg => Date.now() - msg.createdTimestamp > 14 * 24 * 60 * 60 * 1000);
    const recentMessages = messages.filter(msg => Date.now() - msg.createdTimestamp <= 14 * 24 * 60 * 60 * 1000);

    // Bulk delete old messages
    if (oldMessages.length > 0) {
      const messageIds = oldMessages.map(msg => msg.id);
      
      for (let i = 0; i < messageIds.length; i += batchSize) {
        const batch = messageIds.slice(i, i + batchSize);
        await channel.bulkDelete(batch, true);
        deletedCount += batch.length;
      }
    }

    // Delete recent messages individually
    for (const msg of recentMessages) {
      try {
        await msg.delete();
        deletedCount++;
      } catch (error) {
        logger.warn(`Failed to delete message ${msg.id}:`, error);
      }
    }

    return deletedCount;
  }

  /**
   * Get filter text for display
   * 
   * @param {string} user - User filter
   * @param {string} type - Type filter
   * @param {string} content - Content filter
   * @returns {string} Filter text
   * @private
   */
  _getFilterText(user, type, content) {
    const filters = [];
    
    if (user) filters.push(`User: ${user}`);
    if (type) filters.push(`Type: ${type}`);
    if (content) filters.push(`Content: "${content}"`);
    
    return filters.length > 0 ? filters.join(', ') : 'None';
  }

  /**
   * Log purge action for audit purposes
   * 
   * @param {Guild} guild - Discord guild
   * @param {GuildMember} executor - Executing member
   * @param {TextChannel} channel - Channel where purge occurred
   * @param {number} deletedCount - Number of deleted messages
   * @param {string} user - User filter
   * @param {string} type - Type filter
   * @param {string} content - Content filter
   * @private
   */
  _logPurgeAction(guild, executor, channel, deletedCount, user, type, content) {
    logger.info(`🧹 Messages purged in ${guild.name}:`, {
      executor: executor.user.tag,
      executorId: executor.id,
      channel: channel.name,
      channelId: channel.id,
      deletedCount,
      userFilter: user || 'None',
      typeFilter: type || 'None',
      contentFilter: content || 'None',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = PurgeCommand; 