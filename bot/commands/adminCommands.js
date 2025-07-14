/**
 * Admin Commands for Data Retention Management
 * 
 * Provides Discord slash commands for administrators to manage data retention.
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 */

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const DataRetentionConfig = require('../models/DataRetentionConfig');
const dataRetentionService = require('../services/dataRetentionService');
const logger = require('../utils/logger');

/**
 * Command: /dataretention stats
 * Shows data retention statistics (admin only)
 */
const dataRetentionStats = {
  data: new SlashCommandBuilder()
    .setName('dataretention')
    .setDescription('Manage data retention settings')
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('Show data retention statistics (Admin only)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('process')
        .setDescription('Force process scheduled deletions (Admin only)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('cancel')
        .setDescription('Cancel scheduled deletion for this server')
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for cancellation')
            .setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'stats':
          await handleStats(interaction);
          break;
        case 'process':
          await handleProcess(interaction);
          break;
        case 'cancel':
          await handleCancel(interaction);
          break;
        default:
          await interaction.reply({
            content: '❌ Unknown subcommand',
            ephemeral: true
          });
      }
    } catch (error) {
      logger.error('Error executing data retention command:', error);
      await interaction.reply({
        content: '❌ An error occurred while executing the command',
        ephemeral: true
      });
    }
  }
};

/**
 * Handle stats subcommand
 */
async function handleStats(interaction) {
  // Check if user is admin
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return await interaction.reply({
      content: '❌ You need Administrator permissions to use this command',
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const stats = await dataRetentionService.getStats();
    const serviceStatus = dataRetentionService.getStatus();

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Data Retention Statistics')
      .setColor('#FF6B35')
      .setTimestamp()
      .addFields(
        {
          name: '📊 Configuration Stats',
          value: [
            `**Total Configurations:** ${stats.totalConfigs}`,
            `**Immediate Deletion:** ${stats.immediateDeletionConfigs}`,
            `**Scheduled Deletions:** ${stats.scheduledDeletions}`,
            `**Due for Deletion:** ${stats.dueForDeletion}`
          ].join('\n'),
          inline: true
        },
        {
          name: '⚙️ Service Status',
          value: [
            `**Service Running:** ${serviceStatus.isRunning ? '✅ Yes' : '❌ No'}`,
            `**Check Interval:** ${serviceStatus.checkInterval / 1000 / 60} minutes`,
            `**Last Check:** ${serviceStatus.lastCheck.toLocaleString()}`
          ].join('\n'),
          inline: true
        }
      );

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error getting data retention stats:', error);
    await interaction.editReply({
      content: '❌ Error retrieving statistics'
    });
  }
}

/**
 * Handle process subcommand
 */
async function handleProcess(interaction) {
  // Check if user is admin
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return await interaction.reply({
      content: '❌ You need Administrator permissions to use this command',
      ephemeral: true
    });
  }
  
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const processedCount = await dataRetentionService.forceProcess();

    const embed = new EmbedBuilder()
      .setTitle('🔧 Forced Processing Complete')
      .setColor('#00FF00')
      .setDescription(`Successfully processed **${processedCount}** scheduled deletions`)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error processing scheduled deletions:', error);
    await interaction.editReply({
      content: '❌ Error processing scheduled deletions'
    });
  }
}

/**
 * Handle cancel subcommand
 */
async function handleCancel(interaction) {
  const guildId = interaction.guildId;
  const reason = interaction.options.getString('reason') || 'Cancelled via Discord command';

  await interaction.deferReply({ ephemeral: true });

  try {
    // Get current config
    const config = await DataRetentionConfig.findOne({ guildId });
    
    if (!config) {
      return await interaction.editReply({
        content: '❌ No data retention configuration found for this server'
      });
    }

    if (!config.deletionScheduled) {
      return await interaction.editReply({
        content: '❌ No deletion is currently scheduled for this server'
      });
    }

    // Cancel scheduled deletion
    await config.cancelScheduledDeletion();

    const embed = new EmbedBuilder()
      .setTitle('✅ Deletion Cancelled')
      .setColor('#00FF00')
      .setDescription('Scheduled deletion has been cancelled successfully')
      .addFields(
        {
          name: '📅 Previously Scheduled For',
          value: config.scheduledForDeletion.toLocaleString(),
          inline: true
        },
        {
          name: '👤 Cancelled By',
          value: interaction.user.tag,
          inline: true
        },
        {
          name: '📝 Reason',
          value: reason,
          inline: false
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    logger.info(`Scheduled deletion cancelled for guild ${guildId} by ${interaction.user.tag}`, {
      reason,
      userId: interaction.user.id
    });

  } catch (error) {
    logger.error('Error cancelling scheduled deletion:', error);
    await interaction.editReply({
      content: '❌ Error cancelling scheduled deletion'
    });
          }
}

/**
 * Command: /dataretention info
 * Shows current data retention settings for the server
 */
const dataRetentionInfo = {
  data: new SlashCommandBuilder()
    .setName('dataretentioninfo')
    .setDescription('Show current data retention settings for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    try {
      const guildId = interaction.guildId;

      await interaction.deferReply({ ephemeral: true });

      // Get or create settings
      const config = await DataRetentionConfig.getGuildSettings(guildId);
      
      const embed = new EmbedBuilder()
        .setTitle('🗑️ Data Retention Settings')
        .setColor('#FF6B35')
        .setDescription(`Settings for **${interaction.guild.name}**`)
        .addFields(
          {
            name: '⚡ Immediate Deletion',
            value: config.immediateDeletion ? '✅ Enabled' : '❌ Disabled',
            inline: true
          },
          {
            name: '⏰ Retention Period',
            value: config.immediateDeletion ? 'N/A' : `${config.retentionDays} days`,
            inline: true
          },
          {
            name: '📅 Scheduled For',
            value: config.scheduledForDeletion 
              ? config.scheduledForDeletion.toLocaleString()
              : 'Not scheduled',
            inline: true
          },
          {
            name: '📝 Data Types to Delete',
            value: [
              `**Logs:** ${config.deleteLogs ? '✅' : '❌'}`,
              `**Statistics:** ${config.deleteStats ? '✅' : '❌'}`,
              `**Configuration:** ${config.deleteConfig ? '✅' : '❌'}`
            ].join('\n'),
            inline: false
          }
        )
        .setFooter({ 
          text: 'Configure these settings in the web dashboard' 
        })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      logger.error('Error showing data retention info:', error);
      await interaction.editReply({
        content: '❌ Error retrieving data retention information'
      });
    }
  }
};

/**
 * Handle avatar command (for everyone)
 * @param {Message} message - Discord message object
 */
async function handleAvatarCommand(message) {
  try {
    const user = message.mentions.users.first() || message.author;
    const avatarURL = user.displayAvatarURL({ size: 1024, dynamic: true });
    
    // Check if it's for another user or self
    if (message.mentions.users.first()) {
      // Avatar of mentioned user
      await message.reply({
        content: `Avatar of ${user}`,
        files: [avatarURL],
        allowedMentions: { parse: [] }
      });
    } else {
      // Avatar of self
      await message.reply({
        content: `${user}`,
        files: [avatarURL],
        allowedMentions: { parse: [] }
      });
    }
  } catch (error) {
    logger.error('Error in avatar command:', error);
    await message.reply('❌ Error fetching avatar');
  }
}

/**
 * Handle unlock command (admin only)
 * @param {Message} message - Discord message object
 */
async function handleUnlockCommand(message) {
  try {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return await message.reply('❌ You need Administrator permissions to use this command');
    }

    const channel = message.channel;
    
    // Check if channel is already unlocked
    const everyoneRole = message.guild.roles.everyone;
    const currentPerms = channel.permissionOverwrites.cache.get(everyoneRole.id);
    
    if (!currentPerms || !currentPerms.deny.has(PermissionFlagsBits.SendMessages)) {
      await message.reply('ℹ️ This channel is already unlocked.');
      return;
    }
    
    // Unlock the channel
    await channel.permissionOverwrites.edit(everyoneRole, {
      SendMessages: null
    });

    await message.reply('✅ Channel unlocked successfully!');
  } catch (error) {
    logger.error('Error in unlock command:', error);
    await message.reply('❌ Error unlocking channel');
  }
}

/**
 * Handle cleanraid command (admin only)
 * @param {Message} message - Discord message object
 */
async function handleCleanRaidCommand(message) {
  try {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return await message.reply('❌ You need Administrator permissions to use this command');
    }
    
    // This would integrate with your raid detection system
    await message.reply('🧹 Raid cleanup initiated...');
  } catch (error) {
    logger.error('Error in cleanraid command:', error);
    await message.reply('❌ Error during raid cleanup');
  }
}

/**
 * Handle raidstatus command (admin only)
 * @param {Message} message - Discord message object
 */
async function handleRaidStatusCommand(message) {
  try {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return await message.reply('❌ You need Administrator permissions to use this command');
  }
  
    const guild = message.guild;
    
    // Check if server is in lockdown
    const everyoneRole = guild.roles.everyone;
    const lockdownChannels = guild.channels.cache.filter(channel => {
      if (channel.type !== 0) return false; // Only text channels
      const perms = channel.permissionOverwrites.cache.get(everyoneRole.id);
      return perms && perms.deny.has(PermissionFlagsBits.SendMessages);
    });
    
    const embed = new EmbedBuilder()
      .setTitle('🛡️ Raid Status Report')
      .setColor(lockdownChannels.size > 0 ? 0xFF0000 : 0x00FF00)
      .setTimestamp()
      .addFields(
        {
          name: '🔒 Lockdown Status',
          value: lockdownChannels.size > 0 ? '🟡 Active' : '🟢 No lockdown',
          inline: true
        },
        {
          name: '📊 Locked Channels',
          value: lockdownChannels.size.toString(),
          inline: true
        },
        {
          name: '👥 Server Members',
          value: guild.memberCount.toString(),
          inline: true
        }
      );
    
    if (lockdownChannels.size > 0) {
      const lockedChannelNames = lockdownChannels.map(ch => ch.name).slice(0, 5).join(', ');
      embed.addFields({
        name: '🔒 Locked Channels',
        value: lockedChannelNames + (lockdownChannels.size > 5 ? '...' : ''),
        inline: false
      });
    }
    
    await message.reply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error in raidstatus command:', error);
    await message.reply('❌ Error checking raid status');
  }
}

/**
 * Handle nuke command (admin only)
 * @param {Message} message - Discord message object
 */
async function handleNukeCommand(message) {
  try {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return await message.reply('❌ You need Administrator permissions to use this command');
    }

    const channel = message.channel;
    const position = channel.position;
    const newChannel = await channel.clone();
    await channel.delete();
    await newChannel.setPosition(position);
        
    await newChannel.send('💥 Channel nuked successfully!');
  } catch (error) {
    logger.error('Error in nuke command:', error);
    await message.reply('❌ Error nuking channel');
  }
}

/**
 * Handle permissions diagnostic command (admin only)
 * @param {Message} message - Discord message object
 */
async function handlePermissionsCommand(message) {
  try {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return await message.reply('❌ You need Administrator permissions to use this command');
    }

    const botMember = message.guild.members.me;
    const permissions = botMember.permissions.toArray();
    
    await message.reply(`🔧 Bot permissions:\n${permissions.join(', ')}`);
  } catch (error) {
    logger.error('Error in permissions command:', error);
    await message.reply('❌ Error checking permissions');
  }
}

/**
 * Handle purge command (admin only)
 * @param {Message} message - Discord message object
 */
async function handlePurgeCommand(message) {
  try {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return await message.reply('❌ You need Administrator permissions to use this command');
    }

    const args = message.content.split(' ');
    let amount = 10; // Default 10 messages
    
    // If amount is specified
    if (args.length > 1) {
      const specifiedAmount = parseInt(args[1]);
      if (!isNaN(specifiedAmount) && specifiedAmount > 0) {
        amount = Math.min(specifiedAmount, 50); // Maximum 50 messages
      }
    }
    
    logger.info(`🧹 Purge command executed by ${message.author.tag} in ${message.guild.name} - Amount: ${amount}`);
    
    // Check bot permissions
    if (!message.channel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
      await message.reply('❌ I don\'t have permissions to delete messages in this channel.');
      return;
    }
    
    // Get messages and filter deletable ones (exclude the command message)
    const messagesToDelete = await message.channel.messages.fetch({ limit: amount + 1 }); // +1 to include command
    const deletableMessages = messagesToDelete.filter(msg => 
      msg.id !== message.id && // Don't delete the command message
      msg.createdTimestamp > Date.now() - 14 * 24 * 60 * 60 * 1000 && // Only messages from last 14 days
      !msg.pinned // Don't delete pinned messages
    );
    
    if (deletableMessages.size === 0) {
      await message.reply('❌ No messages can be deleted.');
      return;
    }
    
    // Delete messages
    await message.channel.bulkDelete(deletableMessages);
    
    // React with check emoji instead of sending message
    try {
      // First try to find the custom check_yes2 emoji
      const checkEmoji = message.guild.emojis.cache.find(emoji => emoji.name === 'check_yes2');
      if (checkEmoji) {
        await message.react(checkEmoji);
      } else {
        // Fallback to regular check emoji
        await message.react('✅');
      }
    } catch (error) {
      logger.error('Could not react with check emoji:', error);
    }
    
  } catch (error) {
    logger.error('Error purging messages:', error);
    await message.reply('❌ Error deleting messages. Make sure messages are not older than 14 days.');
  }
}

module.exports = {
  dataRetentionStats,
  dataRetentionInfo,
  handleAvatarCommand,
  handleUnlockCommand,
  handleCleanRaidCommand,
  handleRaidStatusCommand,
  handleNukeCommand,
  handlePermissionsCommand,
  handlePurgeCommand
}; 