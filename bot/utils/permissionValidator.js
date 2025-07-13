/**
 * Permission Validation Service
 * Handles all permission checks for bot operations
 */

const { PermissionsBitField } = require('discord.js');
const { REQUIRED_PERMISSIONS } = require('../config/constants');

/**
 * Check if user has required permissions for administrative commands
 * @param {GuildMember} member - Discord guild member
 * @param {Array} requiredPermissions - Array of required permissions
 * @returns {Object} - Validation result with missing permissions
 */
function validateAdminPermissions(member, requiredPermissions = []) {
  const missingPermissions = [];
  const hasAllPermissions = requiredPermissions.every(permission => {
    if (!member.permissions.has(permission)) {
      missingPermissions.push(permission);
      return false;
    }
    return true;
  });
  
  return {
    hasAllPermissions,
    missingPermissions,
    memberPermissions: member.permissions.toArray()
  };
}

/**
 * Check if bot has required permissions in a channel
 * @param {TextChannel} channel - Discord text channel
 * @param {Array} requiredPermissions - Array of required permissions
 * @returns {Object} - Validation result with missing permissions
 */
function validateBotChannelPermissions(channel, requiredPermissions = []) {
  const botMember = channel.guild.members.me;
  if (!botMember) {
    return {
      hasAllPermissions: false,
      missingPermissions: ['Bot not found in guild'],
      botPermissions: []
    };
  }
  
  const missingPermissions = [];
  const hasAllPermissions = requiredPermissions.every(permission => {
    if (!channel.permissionsFor(botMember).has(permission)) {
      missingPermissions.push(permission);
      return false;
    }
    return true;
  });
  
  return {
    hasAllPermissions,
    missingPermissions,
    botPermissions: channel.permissionsFor(botMember).toArray()
  };
}

/**
 * Check if bot has required permissions in a guild
 * @param {Guild} guild - Discord guild
 * @param {Array} requiredPermissions - Array of required permissions
 * @returns {Object} - Validation result with missing permissions
 */
function validateBotGuildPermissions(guild, requiredPermissions = []) {
  const botMember = guild.members.me;
  if (!botMember) {
    return {
      hasAllPermissions: false,
      missingPermissions: ['Bot not found in guild'],
      botPermissions: []
    };
  }
  
  const missingPermissions = [];
  const hasAllPermissions = requiredPermissions.every(permission => {
    if (!botMember.permissions.has(permission)) {
      missingPermissions.push(permission);
      return false;
    }
    return true;
  });
  
  return {
    hasAllPermissions,
    missingPermissions,
    botPermissions: botMember.permissions.toArray()
  };
}

/**
 * Get custom emoji from guild or fallback
 * @param {Guild} guild - Discord guild to get emojis from
 * @param {string} emojiName - Name of the emoji to find
 * @param {string} fallback - Fallback emoji if custom emoji not found
 * @returns {string} - Emoji string (custom or fallback)
 */
function getCustomEmoji(guild, emojiName, fallback) {
  try {
    const customEmoji = guild.emojis.cache.find(emoji => emoji.name === emojiName);
    return customEmoji ? customEmoji.toString() : fallback;
  } catch (error) {
    console.log(`Could not find custom emoji ${emojiName}, using fallback: ${fallback}`);
    return fallback;
  }
}

/**
 * Check if user can perform moderation actions
 * @param {GuildMember} member - Discord guild member
 * @param {GuildMember} target - Target member to moderate
 * @returns {Object} - Validation result
 */
function canModerate(member, target) {
  // Check if user has moderation permissions
  const hasModPerms = member.permissions.has([
    PermissionsBitField.Flags.KickMembers,
    PermissionsBitField.Flags.BanMembers,
    PermissionsBitField.Flags.ManageMessages
  ]);
  
  if (!hasModPerms) {
    return {
      canModerate: false,
      reason: 'Missing moderation permissions'
    };
  }
  
  // Check if target is moderatable
  if (target.user.id === member.user.id) {
    return {
      canModerate: false,
      reason: 'Cannot moderate yourself'
    };
  }
  
  // Check hierarchy
  if (member.roles.highest.position <= target.roles.highest.position) {
    return {
      canModerate: false,
      reason: 'Target has higher or equal role hierarchy'
    };
  }
  
  return {
    canModerate: true,
    reason: 'Valid moderation target'
  };
}

module.exports = {
  validateAdminPermissions,
  validateBotChannelPermissions,
  validateBotGuildPermissions,
  getCustomEmoji,
  canModerate
}; 