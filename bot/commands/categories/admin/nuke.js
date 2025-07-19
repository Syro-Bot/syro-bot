/**
 * @fileoverview Nuke Command - Delete all messages in channel
 * 
 * Administrative command to delete all messages in the current channel.
 * Creates a new channel with the same settings and deletes the old one.
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const TextCommand = require('../../templates/TextCommand');
const logger = require('../../../utils/logger');
const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../..');
const LogManager = require('../../../utils/logManager');

/**
 * Nuke Command Class
 * 
 * Deletes all messages in a channel by recreating it.
 * 
 * @class NukeCommand
 * @extends TextCommand
 */
class NukeCommand extends TextCommand {
  constructor() {
    super({
      name: 'nuke',
      description: 'Delete all messages in the current channel by recreating it',
      category: 'admin',
      permissions: ['ManageChannels'],
      cooldown: 60000, // 1 minute
      aliases: ['clearall', 'deleteall'],
      usage: 'nuke [reason]',
      examples: [
        'nuke',
        'nuke Raid cleanup',
        'nuke Spam removal'
      ],
      args: {
        reason: {
          index: 0,
          type: 'string',
          required: false,
          default: '',
          description: 'Reason for nuking the channel'
        }
      },
      guildOnly: true,
      botPermissions: ['ManageChannels'],
      deleteAfter: false,
      embed: {
        color: '#ff4444'
      }
    });
  }

  /**
   * Execute the nuke command
   * 
   * @param {Message} message - Discord message object
   * @param {Object} args - Parsed arguments
   * @returns {Promise<boolean>} Execution success status
   */
  async run(message, args) {
    const { reason } = args;
    const channel = message.channel;
    const guild = message.guild;
    const executor = message.member;

    try {
      // Check if user has permission to manage this channel
      if (!this.hasChannelPermission(executor, channel, 'ManageChannels')) {
        await this.sendError(message, 'Permission Denied', 'You do not have permission to manage this channel.');
        return false;
      }

      // Check if bot has permission to manage channels
      if (!this.botHasPermissions(guild)) {
        await this.sendError(message, 'Bot Permission Error', 'I do not have permission to manage channels.');
        return false;
      }

      // Create title with reason if provided
      const title = reason ? `Nuke / ${reason}` : 'Nuke';

      // Create confirmation embed with new design
      const confirmEmbed = this.createEmbed({
        title: title,
        description: `Are you sure you want to nuke **${channel.name}**?\n\nThis will:\n• Delete all messages in the channel\n• Create a new channel with the same settings\n• Delete the old channel`,
        color: '#ff4444',
        image: {
          url: 'attachment://mcskelet.gif'
        }
      });

      // Create buttons
      const confirmButton = new ButtonBuilder()
        .setCustomId('nuke_confirm')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✅');

      const cancelButton = new ButtonBuilder()
        .setCustomId('nuke_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌');

      const buttonRow = new ActionRowBuilder()
        .addComponents(confirmButton, cancelButton);

      // Send confirmation message with buttons
      const confirmMessage = await message.reply({
        embeds: [confirmEmbed],
        components: [buttonRow],
        files: [path.join(projectRoot, 'public', 'mcskelet.gif')]
      });

      // Wait for button interaction (30 seconds)
      const filter = (interaction) => 
        interaction.isButton() && 
        interaction.user.id === executor.id &&
        ['nuke_confirm', 'nuke_cancel'].includes(interaction.customId);

      const collected = await confirmMessage.awaitMessageComponent({
        filter,
        time: 30000
      });

      // Clean up confirmation message
      await confirmMessage.delete().catch(() => {});

      // Check if user cancelled
      if (collected.customId === 'nuke_cancel') {
        await this.sendInfo(message, 'Nuke Cancelled', 'Channel nuke operation was cancelled.');
        return true;
      }

      // Store channel settings
      const channelSettings = {
        name: channel.name,
        type: channel.type,
        parent: channel.parent,
        position: channel.position,
        permissionOverwrites: channel.permissionOverwrites.cache,
        topic: channel.topic,
        nsfw: channel.nsfw,
        rateLimitPerUser: channel.rateLimitPerUser,
        bitrate: channel.bitrate,
        userLimit: channel.userLimit,
        rtcRegion: channel.rtcRegion,
        videoQualityMode: channel.videoQualityMode,
        defaultAutoArchiveDuration: channel.defaultAutoArchiveDuration,
        availableTags: channel.availableTags,
        defaultReactionEmoji: channel.defaultReactionEmoji,
        defaultThreadRateLimitPerUser: channel.defaultThreadRateLimitPerUser,
        defaultSortOrder: channel.defaultSortOrder,
        defaultForumLayout: channel.defaultForumLayout
      };

      // Create new channel
      const newChannel = await guild.channels.create({
        name: channelSettings.name,
        type: channelSettings.type,
        parent: channelSettings.parent,
        position: channelSettings.position,
        topic: channelSettings.topic,
        nsfw: channelSettings.nsfw,
        rateLimitPerUser: channelSettings.rateLimitPerUser,
        bitrate: channelSettings.bitrate,
        userLimit: channelSettings.userLimit,
        rtcRegion: channelSettings.rtcRegion,
        videoQualityMode: channelSettings.videoQualityMode,
        defaultAutoArchiveDuration: channelSettings.defaultAutoArchiveDuration,
        availableTags: channelSettings.availableTags,
        defaultReactionEmoji: channelSettings.defaultReactionEmoji,
        defaultThreadRateLimitPerUser: channelSettings.defaultThreadRateLimitPerUser,
        defaultSortOrder: channelSettings.defaultSortOrder,
        defaultForumLayout: channelSettings.defaultForumLayout,
        reason: `Channel nuked by ${executor.user.tag} - ${reason || 'No reason provided'}`
      });

      // Copy permission overwrites
      for (const [id, overwrite] of channelSettings.permissionOverwrites) {
        await newChannel.permissionOverwrites.create(id, overwrite);
      }

      // Delete old channel
      await channel.delete(`Channel nuked by ${executor.user.tag} - ${reason || 'No reason provided'}`);

      // Send success message in new channel
      await newChannel.send(':boom: **Channel Nuked Successfully**');

      // Log para dashboard
      await LogManager.createLog({
        guildId: guild.id,
        type: 'channel_nuke',
        title: 'Channel Nuked',
        description: `Channel #${channel.name} nuked by ${executor.user.tag}`,
        userId: executor.id,
        username: executor.user.tag,
        channelId: channel.id,
        channelName: channel.name,
        severity: 'success',
        metadata: {
          oldChannel: channel.name,
          newChannel: newChannel.name,
          reason: reason || 'No reason provided'
        }
      });

      // Log the action
      this._logNukeAction(guild, executor, channel.name, newChannel.name, reason);

      return true;

    } catch (error) {
      logger.error(`❌ Error in nuke command:`, error);
      
      await this.sendError(
        message, 
        'Nuke Failed', 
        'An error occurred while nuking the channel. Please try again or contact an administrator.'
      );
      
      return false;
    }
  }

  /**
   * Log nuke action for audit purposes
   * 
   * @param {Guild} guild - Discord guild
   * @param {GuildMember} executor - Executing member
   * @param {string} oldChannelName - Old channel name
   * @param {string} newChannelName - New channel name
   * @param {string} reason - Nuke reason
   * @private
   */
  _logNukeAction(guild, executor, oldChannelName, newChannelName, reason) {
    logger.info(`🗑️ Channel nuked in ${guild.name}:`, {
      executor: executor.user.tag,
      executorId: executor.id,
      oldChannel: oldChannelName,
      newChannel: newChannelName,
      reason,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = NukeCommand; 