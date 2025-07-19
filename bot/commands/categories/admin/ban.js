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
const logger = require('../../../utils/logger');
const LogManager = require('../../../utils/logManager');
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
        await message.reply('❌ You do not have permission to ban members.');
        return false;
      }

      // Check if bot has permission to ban members
      if (!this.botHasPermissions(guild)) {
        await message.reply('❌ I do not have permission to ban members.');
        return false;
      }

      // Validate user
      const targetUser = await this.validateUser(userId, guild);
      if (!targetUser) {
        await message.reply('❌ The specified user was not found in this server.');
        return false;
      }

      // Check if user can be banned
      if (!this._canBanUser(executor, targetUser)) {
        await message.reply('❌ You cannot ban this user due to role hierarchy.');
        return false;
      }

      // Check if user is already banned
      const banList = await guild.bans.fetch();
      if (banList.has(targetUser.id)) {
        await message.reply(`${targetUser.user.tag} is already banned from this server.`);
        return true;
      }

      // Ejecutar el ban directamente, sin confirmación
      const banReason = `Banned by ${executor.user.tag} - ${reason}`;
      await guild.members.ban(targetUser, {
        deleteMessageDays: days,
        reason: banReason
      });

      // Mensaje de éxito simple
      await message.reply(`${targetUser.user.tag} has been banned from the server.`);

      // Log para dashboard
      await LogManager.createLog({
        guildId: guild.id,
        type: 'member_banned',
        title: 'User Banned',
        description: `${targetUser.user.tag} was banned by ${executor.user.tag}`,
        userId: executor.id,
        username: executor.user.tag,
        channelId: message.channel.id,
        channelName: message.channel.name,
        severity: 'success',
        metadata: {
          bannedUser: targetUser.user.tag,
          bannedUserId: targetUser.id,
          reason: reason || 'No reason provided'
        }
      });

      // Log the action
      this._logBanAction(guild, executor, targetUser, days, reason);

      return true;

    } catch (error) {
      logger.error(`❌ Error in ban command:`, error);
      await message.reply('❌ Could not ban user.');
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