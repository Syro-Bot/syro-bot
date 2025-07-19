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
const { PermissionsBitField } = require('discord.js');

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
          default: 'No reason provided',
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

      // Send confirmation message
      const confirmEmbed = this.createWarningEmbed(
        'Channel Nuke Confirmation',
        `Are you sure you want to nuke **${channel.name}**?\n\nThis will:\n• Delete all messages in the channel\n• Create a new channel with the same settings\n• Delete the old channel\n\n**Reason:** ${reason}\n\nThis action cannot be undone!`,
        {
          fields: [
            { name: 'Channel', value: channel.name, inline: true },
            { name: 'Messages', value: 'All messages will be deleted', inline: true },
            { name: 'Executor', value: executor.user.tag, inline: true }
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
        await this.sendInfo(message, 'Nuke Cancelled', 'Channel nuke operation was cancelled.');
        return true;
      }

      // Start nuke process
      const processingEmbed = this.createInfoEmbed(
        'Nuking Channel',
        'Processing channel nuke...\nThis may take a few moments.',
        {
          fields: [
            { name: 'Status', value: '🔄 Processing...', inline: true },
            { name: 'Channel', value: channel.name, inline: true },
            { name: 'Executor', value: executor.user.tag, inline: true }
          ]
        }
      );

      const processingMessage = await this.sendResponse(message, processingEmbed);

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
        reason: `Channel nuked by ${executor.user.tag} - ${reason}`
      });

      // Copy permission overwrites
      for (const [id, overwrite] of channelSettings.permissionOverwrites) {
        await newChannel.permissionOverwrites.create(id, overwrite);
      }

      // Delete old channel
      await channel.delete(`Channel nuked by ${executor.user.tag} - ${reason}`);

      // Send success message in new channel
      const successEmbed = this.createSuccessEmbed(
        'Channel Nuked Successfully',
        `The channel has been successfully nuked and recreated.`,
        {
          fields: [
            { name: 'Old Channel', value: channel.name, inline: true },
            { name: 'New Channel', value: newChannel.name, inline: true },
            { name: 'Executor', value: executor.user.tag, inline: true },
            { name: 'Reason', value: reason, inline: false },
            { name: 'Timestamp', value: new Date().toLocaleString(), inline: false }
          ],
          footer: { text: 'Channel nuke completed' }
        }
      );

      await newChannel.send({ embeds: [successEmbed] });

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