/**
 * Reaction Role Service
 * 
 * Handles all reaction role functionality including message creation,
 * reaction handling, role assignment/removal, and performance optimization.
 * Designed for high-traffic Discord servers with efficient caching and
 * rate limiting to prevent API abuse.
 * 
 * @author Syro Development Team
 * @version 1.0.0
 * @since 2024
 */

const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const ReactionRole = require('../models/ReactionRole');
const cacheManager = require('./cacheManager');
const LogManager = require('../utils/logManager');
const { handleError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * Cache for reaction role configurations to reduce database queries
 * Uses Redis when available, falls back to in-memory cache
 */
const REACTION_ROLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const USER_COOLDOWN_CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Create a new reaction role message
 * 
 * @param {Object} config - Reaction role configuration
 * @param {string} config.serverId - Discord server ID
 * @param {string} config.channelId - Discord channel ID
 * @param {string} config.title - Message title
 * @param {string} config.content - Message content
 * @param {Object} config.embed - Embed configuration
 * @param {Array} config.emojiRoles - Array of emoji-role pairs
 * @param {Object} config.options - Additional options
 * @param {string} config.createdBy - User ID who created this
 * @returns {Promise<Object>} Created reaction role configuration
 */
async function createReactionRoleMessage(config) {
  try {
    logger.info(`Creating reaction role message in guild ${config.serverId}`, {
      channelId: config.channelId,
      title: config.title,
      emojiRolesCount: config.emojiRoles.length
    });

    // Validate emoji-role pairs
    if (!config.emojiRoles || config.emojiRoles.length === 0) {
      throw new Error('At least one emoji-role pair is required');
    }

    if (config.emojiRoles.length > 20) {
      throw new Error('Maximum 20 emoji-role pairs allowed per message');
    }

    // Create reaction role configuration
    const reactionRole = new ReactionRole({
      serverId: config.serverId,
      channelId: config.channelId,
      title: config.title,
      content: config.content,
      embed: config.embed,
      emojiRoles: config.emojiRoles.map((er, index) => ({
        id: `er_${Date.now()}_${index}`,
        emoji: er.emoji,
        role: er.role,
        removeOnReactionRemove: er.removeOnReactionRemove !== false,
        description: er.description
      })),
      allowMultipleRoles: config.options?.allowMultipleRoles || false,
      maxRolesPerUser: config.options?.maxRolesPerUser || 1,
      cooldownSeconds: config.options?.cooldownSeconds || 5,
      enableLogging: config.options?.enableLogging !== false,
      logChannelId: config.options?.logChannelId,
      createdBy: config.createdBy,
      updatedBy: config.createdBy
    });

    // Save to database
    await reactionRole.save();

    // Clear cache for this server
    await cacheManager.invalidateCache(`reaction_roles:${config.serverId}`);

    logger.info(`Reaction role message created successfully`, {
      id: reactionRole._id,
      serverId: config.serverId
    });

    return reactionRole;
  } catch (error) {
    handleError(error, 'reaction role creation');
    throw error;
  }
}

/**
 * Send reaction role message to Discord channel
 * 
 * @param {Object} reactionRole - Reaction role configuration
 * @param {Object} channel - Discord channel object
 * @returns {Promise<Object>} Sent message with reactions
 */
async function sendReactionRoleMessage(reactionRole, channel) {
  try {
    logger.info(`Sending reaction role message to channel ${channel.name}`, {
      serverId: reactionRole.serverId,
      messageId: reactionRole._id
    });

    // Check bot permissions
    const botMember = channel.guild.members.me;
    if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      throw new Error('Bot does not have permission to manage roles');
    }

    if (!botMember.permissions.has(PermissionsBitField.Flags.AddReactions)) {
      throw new Error('Bot does not have permission to add reactions');
    }

    // Create embed if configured
    let embed = null;
    if (reactionRole.embed && (reactionRole.embed.title || reactionRole.embed.description)) {
      embed = new EmbedBuilder()
        .setColor(reactionRole.embed.color || '#7289da');

      if (reactionRole.embed.title) embed.setTitle(reactionRole.embed.title);
      if (reactionRole.embed.description) embed.setDescription(reactionRole.embed.description);
      if (reactionRole.embed.imageUrl) embed.setImage(reactionRole.embed.imageUrl);
      if (reactionRole.embed.thumbnailUrl) embed.setThumbnail(reactionRole.embed.thumbnailUrl);
      
      if (reactionRole.embed.author?.name) {
        embed.setAuthor({
          name: reactionRole.embed.author.name,
          iconURL: reactionRole.embed.author.iconUrl
        });
      }
      
      if (reactionRole.embed.footer?.text) {
        embed.setFooter({
          text: reactionRole.embed.footer.text,
          iconURL: reactionRole.embed.footer.iconUrl
        });
      }

      // Add role descriptions if enabled
      if (reactionRole.showRoleDescriptions && reactionRole.emojiRoles.length > 0) {
        const roleDescriptions = reactionRole.emojiRoles
          .map(er => `${er.emoji} **${er.role.name}**${er.description ? ` - ${er.description}` : ''}`)
          .join('\n');
        
        embed.addFields({
          name: 'Available Roles',
          value: roleDescriptions,
          inline: false
        });
      }
    }

    // Send message
    const message = await channel.send({
      content: reactionRole.content || null,
      embeds: embed ? [embed] : []
    });

    // Add reactions
    for (const emojiRole of reactionRole.emojiRoles) {
      try {
        await message.react(emojiRole.emoji);
        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (reactionError) {
        logger.warn(`Failed to add reaction ${emojiRole.emoji}`, {
          error: reactionError.message,
          emoji: emojiRole.emoji,
          role: emojiRole.role.name
        });
      }
    }

    // Update database with message ID
    reactionRole.messageId = message.id;
    await reactionRole.save();

    // Update cache
    await cacheManager.setCache(
      `reaction_role:${message.id}`,
      reactionRole,
      REACTION_ROLE_CACHE_TTL
    );

    logger.info(`Reaction role message sent successfully`, {
      messageId: message.id,
      channelId: channel.id,
      reactionsCount: reactionRole.emojiRoles.length
    });

    return {
      message,
      reactionRole: reactionRole.toObject()
    };
  } catch (error) {
    handleError(error, 'sending reaction role message');
    throw error;
  }
}

/**
 * Handle reaction add event for role assignment
 * 
 * @param {Object} reaction - Discord reaction object
 * @param {Object} user - Discord user object
 * @returns {Promise<boolean>} Success status
 */
async function handleReactionAdd(reaction, user) {
  try {
    // Ignore bot reactions
    if (user.bot) return false;

    // Get reaction role configuration
    const reactionRole = await getReactionRoleByMessageId(reaction.message.id);
    if (!reactionRole) return false;

    // Check if emoji is configured
    const emojiRole = reactionRole.emojiRoles.find(er => er.emoji === reaction.emoji.toString());
    if (!emojiRole) return false;

    // Get guild member
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id);

    // Check cooldown
    const cooldownKey = `cooldown:${guild.id}:${user.id}:${reactionRole._id}`;
    if (await cacheManager.getCache(cooldownKey)) {
      logger.debug(`User ${user.tag} is on cooldown for reaction role`, {
        serverId: guild.id,
        userId: user.id,
        roleName: emojiRole.role.name
      });
      return false;
    }

    // Check if user already has the role
    if (member.roles.cache.has(emojiRole.role.id)) {
      logger.debug(`User ${user.tag} already has role ${emojiRole.role.name}`);
      return false;
    }

    // Check multiple roles limit
    const userReactionRoles = await getUserReactionRoles(guild.id, user.id, reactionRole._id);
    if (!reactionRole.canUserHaveMoreRoles(userReactionRoles.length)) {
      logger.debug(`User ${user.tag} cannot have more roles from this message`, {
        currentCount: userReactionRoles.length,
        maxAllowed: reactionRole.maxRolesPerUser
      });
      return false;
    }

    // Assign role
    await member.roles.add(emojiRole.role.id, 'Reaction role assignment');

    // Set cooldown
    await cacheManager.setCache(
      cooldownKey,
      true,
      reactionRole.cooldownSeconds * 1000
    );

    // Log role assignment
    if (reactionRole.enableLogging) {
      await LogManager.logRoleAssignment(
        guild.id,
        member,
        emojiRole.role,
        'Reaction role assignment'
      );
    }

    logger.info(`Role ${emojiRole.role.name} assigned to ${user.tag}`, {
      serverId: guild.id,
      userId: user.id,
      roleId: emojiRole.role.id
    });

    return true;
  } catch (error) {
    handleError(error, 'reaction add handler');
    return false;
  }
}

/**
 * Handle reaction remove event for role removal
 * 
 * @param {Object} reaction - Discord reaction object
 * @param {Object} user - Discord user object
 * @returns {Promise<boolean>} Success status
 */
async function handleReactionRemove(reaction, user) {
  try {
    // Ignore bot reactions
    if (user.bot) return false;

    // Get reaction role configuration
    const reactionRole = await getReactionRoleByMessageId(reaction.message.id);
    if (!reactionRole) return false;

    // Check if emoji is configured
    const emojiRole = reactionRole.emojiRoles.find(er => er.emoji === reaction.emoji.toString());
    if (!emojiRole) return false;

    // Check if role should be removed
    if (!emojiRole.removeOnReactionRemove) return false;

    // Get guild member
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id);

    // Check if user has the role
    if (!member.roles.cache.has(emojiRole.role.id)) return false;

    // Remove role
    await member.roles.remove(emojiRole.role.id, 'Reaction role removal');

    // Log role removal
    if (reactionRole.enableLogging) {
      await LogManager.logRoleRemoval(
        guild.id,
        member,
        emojiRole.role,
        'Reaction role removal'
      );
    }

    logger.info(`Role ${emojiRole.role.name} removed from ${user.tag}`, {
      serverId: guild.id,
      userId: user.id,
      roleId: emojiRole.role.id
    });

    return true;
  } catch (error) {
    handleError(error, 'reaction remove handler');
    return false;
  }
}

/**
 * Get reaction role configuration by message ID
 * Uses caching for performance optimization
 * 
 * @param {string} messageId - Discord message ID
 * @returns {Promise<Object|null>} Reaction role configuration
 */
async function getReactionRoleByMessageId(messageId) {
  try {
    // Try cache first
    const cached = await cacheManager.getCache(`reaction_role:${messageId}`);
    if (cached) return cached;

    // Fallback to database
    const reactionRole = await ReactionRole.findByMessageId(messageId);
    if (!reactionRole) return null;

    // Cache for future requests
    await cacheManager.setCache(
      `reaction_role:${messageId}`,
      reactionRole,
      REACTION_ROLE_CACHE_TTL
    );

    return reactionRole;
  } catch (error) {
    handleError(error, 'getting reaction role by message ID');
    return null;
  }
}

/**
 * Get all active reaction roles for a server
 * Uses caching for performance optimization
 * 
 * @param {string} serverId - Discord server ID
 * @returns {Promise<Array>} Array of reaction role configurations
 */
async function getReactionRolesByServer(serverId) {
  try {
    // Try cache first
    const cached = await cacheManager.getCache(`reaction_roles:${serverId}`);
    if (cached) return cached;

    // Fallback to database
    const reactionRoles = await ReactionRole.findActiveByServer(serverId);

    // Cache for future requests
    await cacheManager.setCache(
      `reaction_roles:${serverId}`,
      reactionRoles,
      REACTION_ROLE_CACHE_TTL
    );

    return reactionRoles;
  } catch (error) {
    handleError(error, 'getting reaction roles by server');
    return [];
  }
}

/**
 * Get user's current reaction roles from a specific message
 * 
 * @param {string} serverId - Discord server ID
 * @param {string} userId - Discord user ID
 * @param {string} reactionRoleId - Reaction role message ID
 * @returns {Promise<Array>} Array of role IDs
 */
async function getUserReactionRoles(serverId, userId, reactionRoleId) {
  try {
    const reactionRole = await ReactionRole.findById(reactionRoleId);
    if (!reactionRole || reactionRole.serverId !== serverId) return [];

    const guild = await cacheManager.getGuild(serverId);
    if (!guild) return [];

    const member = await guild.members.fetch(userId);
    if (!member) return [];

    // Get roles that match the configured emoji-role pairs
    const configuredRoleIds = reactionRole.emojiRoles.map(er => er.role.id);
    return member.roles.cache
      .filter(role => configuredRoleIds.includes(role.id))
      .map(role => role.id);
  } catch (error) {
    handleError(error, 'getting user reaction roles');
    return [];
  }
}

/**
 * Delete a reaction role message
 * 
 * @param {string} reactionRoleId - Reaction role ID
 * @param {string} serverId - Discord server ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteReactionRole(reactionRoleId, serverId) {
  try {
    const reactionRole = await ReactionRole.findById(reactionRoleId);
    if (!reactionRole || reactionRole.serverId !== serverId) {
      throw new Error('Reaction role not found or access denied');
    }

    // Delete from database
    await ReactionRole.findByIdAndDelete(reactionRoleId);

    // Clear cache
    await cacheManager.invalidateCache(`reaction_roles:${serverId}`);
    if (reactionRole.messageId) {
      await cacheManager.invalidateCache(`reaction_role:${reactionRole.messageId}`);
    }

    logger.info(`Reaction role deleted`, {
      id: reactionRoleId,
      serverId: serverId
    });

    return true;
  } catch (error) {
    handleError(error, 'deleting reaction role');
    throw error;
  }
}

/**
 * Update reaction role configuration
 * 
 * @param {string} reactionRoleId - Reaction role ID
 * @param {Object} updates - Update data
 * @param {string} updatedBy - User ID who made the update
 * @returns {Promise<Object>} Updated reaction role
 */
async function updateReactionRole(reactionRoleId, updates, updatedBy) {
  try {
    const reactionRole = await ReactionRole.findById(reactionRoleId);
    if (!reactionRole) {
      throw new Error('Reaction role not found');
    }

    // Update fields
    Object.assign(reactionRole, updates);
    reactionRole.updatedBy = updatedBy;

    // Save changes
    await reactionRole.save();

    // Clear cache
    await cacheManager.invalidateCache(`reaction_roles:${reactionRole.serverId}`);
    if (reactionRole.messageId) {
      await cacheManager.invalidateCache(`reaction_role:${reactionRole.messageId}`);
    }

    logger.info(`Reaction role updated`, {
      id: reactionRoleId,
      serverId: reactionRole.serverId
    });

    return reactionRole;
  } catch (error) {
    handleError(error, 'updating reaction role');
    throw error;
  }
}

module.exports = {
  createReactionRoleMessage,
  sendReactionRoleMessage,
  handleReactionAdd,
  handleReactionRemove,
  getReactionRoleByMessageId,
  getReactionRolesByServer,
  getUserReactionRoles,
  deleteReactionRole,
  updateReactionRole
}; 