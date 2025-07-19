/**
 * @fileoverview Kick Command - Kick users from server
 * 
 * Administrative command to kick users from the server.
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

class KickCommand extends TextCommand {
  constructor() {
    super({
      name: 'kick',
      description: 'Kick a user from the server',
      category: 'admin',
      permissions: ['KickMembers'],
      cooldown: 10000, // 10 seconds
      aliases: ['kickuser', 'kickmember'],
      usage: 'kick <user> [reason]',
      examples: [
        'kick @user',
        'kick @user Spamming',
        'kick 123456789012345678'
      ],
      args: {
        user: {
          index: 0,
          type: 'user',
          required: true,
          description: 'User to kick'
        },
        reason: {
          index: 1,
          type: 'string',
          required: false,
          default: 'No reason provided',
          description: 'Reason for the kick'
        }
      },
      guildOnly: true,
      botPermissions: ['KickMembers'],
      deleteAfter: false,
      embed: {
        color: '#ff8800'
      }
    });
  }

  async run(message, args) {
    const { user: userId, reason } = args;
    const guild = message.guild;
    const executor = message.member;

    try {
      if (!this.hasPermission(executor)) {
        await message.reply('❌ You do not have permission to kick members.');
        return false;
      }
      if (!this.botHasPermissions(guild)) {
        await message.reply('❌ I do not have permission to kick members.');
        return false;
      }
      const targetUser = await this.validateUser(userId, guild);
      if (!targetUser) {
        await message.reply('❌ The specified user was not found in this server.');
        return false;
      }
      if (!this._canKickUser(executor, targetUser)) {
        await message.reply('❌ You cannot kick this user due to role hierarchy.');
        return false;
      }
      // Ejecutar el kick directamente
      const kickReason = `Kicked by ${executor.user.tag} - ${reason}`;
      await guild.members.kick(targetUser, kickReason);
      await message.reply(`${targetUser.user.tag} has been kicked from the server.`);

      // Log para dashboard
      await LogManager.createLog({
        guildId: guild.id,
        type: 'member_kicked',
        title: 'User Kicked',
        description: `${targetUser.user.tag} was kicked by ${executor.user.tag}`,
        userId: executor.id,
        username: executor.user.tag,
        channelId: message.channel.id,
        channelName: message.channel.name,
        severity: 'success',
        metadata: {
          kickedUser: targetUser.user.tag,
          kickedUserId: targetUser.id,
          reason: reason || 'No reason provided'
        }
      });
      this._logKickAction(guild, executor, targetUser, reason);
      return true;
    } catch (error) {
      logger.error(`❌ Error in kick command:`, error);
      await message.reply('❌ Could not kick user.');
      return false;
    }
  }

  _canKickUser(executor, target) {
    if (executor.id === process.env.BOT_OWNER_ID) return true;
    if (executor.id === target.id) return false;
    return executor.roles.highest.position > target.roles.highest.position;
  }

  _logKickAction(guild, executor, target, reason) {
    logger.info(`👢 User kicked in ${guild.name}:`, {
      executor: executor.user.tag,
      executorId: executor.id,
      target: target.user.tag,
      targetId: target.id,
      reason,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = KickCommand; 