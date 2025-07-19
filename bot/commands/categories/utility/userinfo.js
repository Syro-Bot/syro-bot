/**
 * @fileoverview User Info Command - Display user information
 * 
 * Utility command to display detailed information about a user.
 * Shows user stats, roles, permissions, and activity information.
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const TextCommand = require('../../templates/TextCommand');
const logger = require('../../../utils/logger');
const { EmbedBuilder } = require('discord.js');

/**
 * User Info Command Class
 * 
 * Displays detailed information about a user.
 * 
 * @class UserInfoCommand
 * @extends TextCommand
 */
class UserInfoCommand extends TextCommand {
  constructor() {
    super({
      name: 'userinfo',
      description: 'Display detailed information about a user',
      category: 'utility',
      permissions: [],
      cooldown: 10000, // 10 seconds
      aliases: ['user', 'whois', 'userinfo'],
      usage: 'userinfo [user]',
      examples: [
        'userinfo',
        'userinfo @user',
        'userinfo 123456789012345678'
      ],
      args: {
        user: {
          index: 0,
          type: 'user',
          required: false,
          description: 'User to get information about (defaults to command author)'
        }
      },
      guildOnly: false,
      botPermissions: [],
      deleteAfter: false,
      embed: {
        color: '#0099ff'
      }
    });
  }

  /**
   * Execute the userinfo command
   * 
   * @param {Message} message - Discord message object
   * @param {Object} args - Parsed arguments
   * @returns {Promise<boolean>} Execution success status
   */
  async run(message, args) {
    const { user: userId } = args;
    const guild = message.guild;
    const executor = message.member;

    try {
      // Determine target user
      let targetUser;
      let targetMember = null;

      if (userId) {
        // Get user from argument
        targetUser = await this.validateUser(userId, guild);
        if (targetUser) {
          targetMember = targetUser;
        } else {
          // Try to fetch user from Discord API
          try {
            const user = await message.client.users.fetch(userId);
            targetUser = user;
          } catch (error) {
            await this.sendError(message, 'User Not Found', 'The specified user was not found.');
            return false;
          }
        }
      } else {
        // Use command author
        targetUser = message.author;
        targetMember = executor;
      }

      // Create user info embed
      const userEmbed = this.createEmbed({
        title: '👤 User Information',
        description: `Detailed information about **${targetUser.tag}**`,
        color: targetMember ? targetMember.displayHexColor : '#0099ff',
        thumbnail: targetUser.displayAvatarURL({ dynamic: true, size: 256 }),
        fields: this._getUserFields(targetUser, targetMember, guild),
        footer: { text: `User ID: ${targetUser.id}` }
      });

      await this.sendResponse(message, userEmbed);

      return true;

    } catch (error) {
      logger.error(`❌ Error in userinfo command:`, error);
      
      await this.sendError(
        message, 
        'User Info Failed', 
        'An error occurred while fetching user information. Please try again.'
      );
      
      return false;
    }
  }

  /**
   * Get user information fields
   * 
   * @param {User} user - Discord user
   * @param {GuildMember} member - Guild member (null if not in guild)
   * @param {Guild} guild - Discord guild
   * @returns {Array} Embed fields
   * @private
   */
  _getUserFields(user, member, guild) {
    const fields = [];

    // Basic Information
    fields.push({
      name: '📋 Basic Information',
      value: this._getBasicInfo(user, member),
      inline: false
    });

    // Account Information
    fields.push({
      name: '📅 Account Information',
      value: this._getAccountInfo(user),
      inline: false
    });

    // Guild-specific information (if member is in guild)
    if (member && guild) {
      fields.push({
        name: '🏠 Guild Information',
        value: this._getGuildInfo(member, guild),
        inline: false
      });

      // Roles Information
      const rolesInfo = this._getRolesInfo(member);
      if (rolesInfo) {
        fields.push({
          name: '🎭 Roles Information',
          value: rolesInfo,
          inline: false
        });
      }

      // Permissions Information
      const permissionsInfo = this._getPermissionsInfo(member);
      if (permissionsInfo) {
        fields.push({
          name: '🔐 Key Permissions',
          value: permissionsInfo,
          inline: false
        });
      }
    }

    return fields;
  }

  /**
   * Get basic user information
   * 
   * @param {User} user - Discord user
   * @param {GuildMember} member - Guild member
   * @returns {string} Basic information
   * @private
   */
  _getBasicInfo(user, member) {
    const info = [];
    
    info.push(`**Username:** ${user.username}`);
    info.push(`**Display Name:** ${member ? member.displayName : user.username}`);
    info.push(`**Discriminator:** #${user.discriminator}`);
    info.push(`**Bot:** ${user.bot ? 'Yes' : 'No'}`);
    
    if (user.banner) {
      info.push(`**Banner:** [View Banner](${user.bannerURL({ dynamic: true, size: 1024 })})`);
    }
    
    return info.join('\n');
  }

  /**
   * Get account information
   * 
   * @param {User} user - Discord user
   * @returns {string} Account information
   * @private
   */
  _getAccountInfo(user) {
    const info = [];
    
    info.push(`**Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:F>`);
    info.push(`**Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`);
    
    if (user.avatar) {
      info.push(`**Avatar:** [View Avatar](${user.displayAvatarURL({ dynamic: true, size: 1024 })})`);
    }
    
    // Account flags
    const flags = user.flags?.toArray() || [];
    if (flags.length > 0) {
      const flagNames = flags.map(flag => this._getFlagName(flag)).join(', ');
      info.push(`**Badges:** ${flagNames}`);
    }
    
    return info.join('\n');
  }

  /**
   * Get guild-specific information
   * 
   * @param {GuildMember} member - Guild member
   * @param {Guild} guild - Discord guild
   * @returns {string} Guild information
   * @private
   */
  _getGuildInfo(member, guild) {
    const info = [];
    
    info.push(`**Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:F>`);
    info.push(`**Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`);
    info.push(`**Nickname:** ${member.nickname || 'None'}`);
    info.push(`**Color:** ${member.displayHexColor}`);
    info.push(`**Hoisted Role:** ${member.roles.hoist ? member.roles.hoist.name : 'None'}`);
    
    // Voice channel
    if (member.voice.channel) {
      info.push(`**Voice Channel:** ${member.voice.channel.name}`);
      info.push(`**Voice Status:** ${member.voice.deaf ? 'Deafened' : member.voice.mute ? 'Muted' : 'Speaking'}`);
    } else {
      info.push(`**Voice Channel:** Not in voice`);
    }
    
    return info.join('\n');
  }

  /**
   * Get roles information
   * 
   * @param {GuildMember} member - Guild member
   * @returns {string} Roles information
   * @private
   */
  _getRolesInfo(member) {
    const roles = member.roles.cache
      .filter(role => role.id !== member.guild.id) // Exclude @everyone
      .sort((a, b) => b.position - a.position);
    
    if (roles.size === 0) {
      return 'No roles assigned';
    }
    
    const roleList = roles.map(role => {
      const mention = role.mentionable ? role.toString() : `\`${role.name}\``;
      return `${mention} (${role.position})`;
    });
    
    // Limit to first 10 roles to avoid embed limits
    const displayRoles = roleList.slice(0, 10);
    const remaining = roleList.length - 10;
    
    let result = displayRoles.join('\n');
    if (remaining > 0) {
      result += `\n... and ${remaining} more`;
    }
    
    return result;
  }

  /**
   * Get key permissions information
   * 
   * @param {GuildMember} member - Guild member
   * @returns {string} Permissions information
   * @private
   */
  _getPermissionsInfo(member) {
    const keyPermissions = [
      'Administrator',
      'ManageGuild',
      'ManageChannels',
      'ManageMessages',
      'ManageRoles',
      'BanMembers',
      'KickMembers',
      'ManageNicknames',
      'MuteMembers',
      'DeafenMembers',
      'MoveMembers',
      'ViewAuditLog'
    ];
    
    const permissions = member.permissions.toArray();
    const hasPermissions = keyPermissions.filter(perm => permissions.includes(perm));
    
    if (hasPermissions.length === 0) {
      return 'No key permissions';
    }
    
    return hasPermissions.map(perm => `• ${perm}`).join('\n');
  }

  /**
   * Get flag name from flag
   * 
   * @param {string} flag - User flag
   * @returns {string} Flag name
   * @private
   */
  _getFlagName(flag) {
    const flagNames = {
      'ActiveDeveloper': 'Active Developer',
      'BugHunterGlobal': 'Bug Hunter Global',
      'BugHunterLevel1': 'Bug Hunter',
      'CertifiedModerator': 'Discord Certified Moderator',
      'HypeSquadOnlineHouse1': 'House Bravery',
      'HypeSquadOnlineHouse2': 'House Brilliance',
      'HypeSquadOnlineHouse3': 'House Balance',
      'Hypesquad': 'HypeSquad Events',
      'Partner': 'Partnered Server Owner',
      'PremiumEarlySupporter': 'Early Supporter',
      'Staff': 'Discord Employee',
      'TeamPseudoUser': 'Team User',
      'VerifiedBot': 'Verified Bot',
      'VerifiedDeveloper': 'Verified Bot Developer'
    };
    
    return flagNames[flag] || flag;
  }
}

module.exports = UserInfoCommand; 