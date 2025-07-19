/**
 * @fileoverview Ban Command - Ban users from server
 * 
 * Administrative command to ban users from the server.
 * Supports temporary bans and reason logging.
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const TextCommand = require('../../templates/TextCommand');
const { PermissionsBitField } = require('discord.js');

/**
 * Ban Command Class
 * 
 * Bans users from the server with various options.
 * 
 * @class BanCommand
 * @extends TextCommand
 */
class BanCommand extends TextCommand {
  constructor() {
    super({
      name: 'ban',
      description: 'Ban a user from the server',
      category: 'admin',
      permissions: ['BanMembers'],
      cooldown: 10000, // 10 seconds
      aliases: ['banuser', 'banmember'],
      usage: 'ban <user> [days] [reason]',
      examples: [
        'ban @user',
        'ban @user 7 Spamming',
        'ban @user 0 Breaking rules',
        'ban 123456789012345678'
      ],
      args: {
        user: {
          index: 0,
          type: 'user',
          required: true,
          description: 'User to ban'
        },
        days: {
          index: 1,
          type: 'integer',
          required: false,
          min: 0,
          max: 7,
          default: 1,
          description: 'Number of days of messages to delete (0-7)'
        },
        reason: {
          index: 2,
          type: 'string',
          required: false,
          default: 'No reason provided',
          description: 'Reason for the ban'
        }
      },
      guildOnly: true,
      botPermissions: ['BanMembers'],
      deleteAfter: false,
      embed: {
        color: '#ff0000'
      }
    });
  }

  /**
   * Execute the ban command
   * 
   * @param {Message} message - Discord message object
   * @param {Object} args - Parsed arguments
   * @returns {Promise<boolean>} Execution success status
   */
  async run(message, args) {
    const { user: userId, days, reason } = args;
    const guild = message.guild;
    const executor = message.member;

    try {
      // Check if user has permission to ban members
      if (!this.hasPermission(executor)) {
        await this.sendError(message, 'Permission Denied', 'You do not have permission to ban members.');
        return false;
      }

      // Check if bot has permission to ban members
      if (!this.botHasPermissions(guild)) {
        await this.sendError(message, 'Bot Permission Error', 'I do not have permission to ban members.');
        return false;
      }

      // Validate user
      const targetUser = await this.validateUser(userId, guild);
      if (!targetUser) {
        await this.sendError(message, 'User Not Found', 'The specified user was not found in this server.');
        return false;
      }

      // Check if user can be banned
      if (!this._canBanUser(executor, targetUser)) {
        await this.sendError(message, 'Cannot Ban User', 'You cannot ban this user due to role hierarchy.');
        return false;
      }

      // Check if user is already banned
      const banList = await guild.bans.fetch();
      if (banList.has(targetUser.id)) {
        await this.sendWarning(message, 'User Already Banned', `${targetUser.user.tag} is already banned from this server.`);
        return true;
      }

      // Send confirmation message
      const confirmEmbed = this.createWarningEmbed(
        'Ban Confirmation',
        `Are you sure you want to ban **${targetUser.user.tag}**?\n\n**User:** ${targetUser.user.tag} (${targetUser.id})\n**Delete Messages:** ${days} day(s)\n**Reason:** ${reason}\n\nThis action cannot be undone!`,
        {
          fields: [
            { name: 'User', value: targetUser.user.tag, inline: true },
            { name: 'User ID', value: targetUser.id, inline: true },
            { name: 'Executor', value: executor.user.tag, inline: true },
            { name: 'Delete Messages', value: `${days} day(s)`, inline: true },
            { name: 'Reason', value: reason, inline: false }
          ]
        }
      );

      const confirmMessage = await this.sendResponse(message, confirmEmbed);

      // Add reaction for confirmation
      await confirmMessage.react('✅');
      await confirmMessage.react('❌');

      // Wait for confirmation (30 seconds)
      const filter = (reaction, user) => 
        ['✅', '❌'].includes(reaction.emoji.name) && 
        user.id === executor.id;

      const collected = await confirmMessage.awaitReactions({
        filter,
        max: 1,
        time: 30000
      });

      // Clean up confirmation message
      await confirmMessage.delete().catch(() => {});

      // Check if user confirmed
      const reaction = collected.first();
      if (!reaction || reaction.emoji.name === '❌') {
        await this.sendInfo(message, 'Ban Cancelled', 'User ban operation was cancelled.');
        return true;
      }

      // Execute ban
      const banReason = `Banned by ${executor.user.tag} - ${reason}`;
      await guild.members.ban(targetUser, {
        deleteMessageDays: days,
        reason: banReason
      });

      // Send success message
      const successEmbed = this.createSuccessEmbed(
        'User Banned Successfully',
        `${targetUser.user.tag} has been banned from the server.`,
        {
          fields: [
            { name: 'User', value: targetUser.user.tag, inline: true },
            { name: 'User ID', value: targetUser.id, inline: true },
            { name: 'Executor', value: executor.user.tag, inline: true },
            { name: 'Delete Messages', value: `${days} day(s)`, inline: true },
            { name: 'Reason', value: reason, inline: false },
            { name: 'Timestamp', value: new Date().toLocaleString(), inline: false }
          ],
          footer: { text: 'User ban completed' }
        }
      );

      await this.sendResponse(message, successEmbed);

      // Send DM to banned user
      await this._sendBanDM(targetUser, guild, reason, executor);

      // Log the action
      this._logBanAction(guild, executor, targetUser, days, reason);

      return true;

    } catch (error) {
      logger.error(`❌ Error in ban command:`, error);
      
      await this.sendError(
        message, 
        'Ban Failed', 
        'An error occurred while banning the user. Please try again or contact an administrator.'
      );
      
      return false;
    }
  }

  /**
   * Check if user can be banned
   * 
   * @param {GuildMember} executor - Executing member
   * @param {GuildMember} target - Target member
   * @returns {boolean} Whether user can be banned
   * @private
   */
  _canBanUser(executor, target) {
    // Bot owner can ban anyone
    if (executor.id === process.env.BOT_OWNER_ID) return true;
    
    // Users can't ban themselves
    if (executor.id === target.id) return false;
    
    // Check role hierarchy
    return executor.roles.highest.position > target.roles.highest.position;
  }

  /**
   * Send DM to banned user
   * 
   * @param {GuildMember} target - Banned member
   * @param {Guild} guild - Discord guild
   * @param {string} reason - Ban reason
   * @param {GuildMember} executor - Executing member
   * @private
   */
  async _sendBanDM(target, guild, reason, executor) {
    try {
      const dmEmbed = this.createErrorEmbed(
        'You Have Been Banned',
        `You have been banned from **${guild.name}**.\n\n**Reason:** ${reason}\n**Banned by:** ${executor.user.tag}\n**Date:** ${new Date().toLocaleString()}\n\nIf you believe this was a mistake, please contact a server administrator.`,
        {
          fields: [
            { name: 'Server', value: guild.name, inline: true },
            { name: 'Banned by', value: executor.user.tag, inline: true },
            { name: 'Reason', value: reason, inline: false }
          ],
          footer: { text: 'You can appeal this ban by contacting server staff' }
        }
      );

      await target.user.send({ embeds: [dmEmbed] });
    } catch (error) {
      logger.warn(`Failed to send ban DM to ${target.user.tag}:`, error);
    }
  }

  /**
   * Log ban action for audit purposes
   * 
   * @param {Guild} guild - Discord guild
   * @param {GuildMember} executor - Executing member
   * @param {GuildMember} target - Banned member
   * @param {number} days - Days of messages deleted
   * @param {string} reason - Ban reason
   * @private
   */
  _logBanAction(guild, executor, target, days, reason) {
    logger.info(`🔨 User banned in ${guild.name}:`, {
      executor: executor.user.tag,
      executorId: executor.id,
      target: target.user.tag,
      targetId: target.id,
      deleteMessageDays: days,
      reason,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = BanCommand; 