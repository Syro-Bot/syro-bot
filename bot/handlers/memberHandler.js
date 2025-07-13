/**
 * Member Handler
 * Handles member join, leave, and update events
 */

const { AttachmentBuilder } = require('discord.js');
const cacheManager = require('../services/cacheManager');
const automodService = require('../services/automodService');
const { generateWelcomeImage } = require('../utils/imageGenerator');
const LogManager = require('../utils/logManager');
const { handleError } = require('../utils/errorHandler');

/**
 * Handle member join event
 * @param {GuildMember} member - Discord guild member
 */
async function handleMemberAdd(member) {
  try {
    console.log(`👋 ${member.user.tag} joined ${member.guild.name}`);
    
    // Log user join event
    await LogManager.logUserJoin(member.guild.id, member);
    
    // Import the Join model for analytics
    const Join = require('../models/Join');
    
    // Save join event to MongoDB for analytics (always save for statistics)
    try {
      const joinEvent = new Join({
        userId: member.user.id,
        username: member.user.tag,
        guildId: member.guild.id,
        guildName: member.guild.name,
        timestamp: new Date()
      });
      await joinEvent.save();
      console.log(`📊 Join event saved to database for ${member.user.tag}`);
    } catch (dbError) {
      console.error('❌ Error saving join event to database:', dbError);
    }
    
    // Handle welcome messages - Get from WelcomeConfig collection
    const WelcomeConfig = require('../models/WelcomeConfig');
    const welcomeConfig = await WelcomeConfig.findOne({ serverId: member.guild.id });
    
    console.log(`🎉 Welcome config check for ${member.guild.name}:`, {
      hasWelcomeConfig: !!welcomeConfig,
      welcomeConfig: welcomeConfig
    });
    
    if (welcomeConfig && welcomeConfig.enabled && welcomeConfig.channelId) {
      await handleWelcomeMessage(member, welcomeConfig);
    } else {
      console.log(`ℹ️ No welcome configuration found or disabled for guild: ${member.guild.name}`);
    }
    
    // Handle join roles - Get from ServerConfig collection
    const ServerConfig = require('../models/ServerConfig');
    const serverConfig = await ServerConfig.findOne({ serverId: member.guild.id });
    
    if (serverConfig && serverConfig.joinRoles) {
      await handleJoinRoles(member, serverConfig.joinRoles);
    }
    
    // Handle raid detection
    await automodService.handleJoinRaidDetection(member, serverConfig);
    
  } catch (error) {
    handleError(error, 'member join handler');
  }
}

/**
 * Handle member leave event
 * @param {GuildMember} member - Discord guild member
 */
async function handleMemberRemove(member) {
  try {
    console.log(`👋 ${member.user.tag} left ${member.guild.name}`);
    
    // Handle leave messages - Get from WelcomeConfig collection
    const WelcomeConfig = require('../models/WelcomeConfig');
    const welcomeConfig = await WelcomeConfig.findOne({ serverId: member.guild.id });
    
    if (welcomeConfig && welcomeConfig.enabled && welcomeConfig.customMessage) {
      await handleLeaveMessage(member, welcomeConfig);
    }
    
    // Log member leave
    await LogManager.logUserLeave(member.guild.id, member);
    
  } catch (error) {
    handleError(error, 'member leave handler');
  }
}

/**
 * Handle member update event (boost detection)
 * @param {GuildMember} oldMember - Old member state
 * @param {GuildMember} newMember - New member state
 */
async function handleMemberUpdate(oldMember, newMember) {
  try {
    // Check if user started boosting
    if (!oldMember.premiumSince && newMember.premiumSince) {
      console.log(`🚀 User ${newMember.user.tag} boosted ${newMember.guild.name}!`);
      
      // Handle boost messages - Get from WelcomeConfig collection
      const WelcomeConfig = require('../models/WelcomeConfig');
      const welcomeConfig = await WelcomeConfig.findOne({ serverId: newMember.guild.id });
      
      if (welcomeConfig && welcomeConfig.enabled && welcomeConfig.customMessage) {
        await handleBoostMessage(newMember, welcomeConfig);
      }
      
      // Log boost detection
      await LogManager.logBoostDetected(newMember.guild.id, newMember);
    }
  } catch (error) {
    handleError(error, 'member update handler');
  }
}

/**
 * Handle welcome message with image generation
 * @param {GuildMember} member - Discord guild member
 * @param {Object} welcomeConfig - Welcome configuration
 */
async function handleWelcomeMessage(member, welcomeConfig) {
  try {
    const channel = member.guild.channels.cache.get(welcomeConfig.channelId);
    if (!channel) {
      console.log(`❌ Welcome channel not found: ${welcomeConfig.channelId}`);
      return;
    }
    
    console.log(`🎉 Sending welcome message for ${member.user.tag} in ${channel.name}`);
    
    // Generate welcome image using MongoDB config
    let userAvatarUrl = member.user.displayAvatarURL({ format: 'png', size: 512 });
    userAvatarUrl = userAvatarUrl.replace('.webp', '.png');
    console.log(`🖼️ Avatar URL for ${member.user.tag}: ${userAvatarUrl}`);
    
    // Convert MongoDB config to format expected by generateWelcomeImage
    const config = {
      backgroundColor: welcomeConfig.backgroundImage?.color || '#1a1a1a',
      backgroundImage: welcomeConfig.backgroundImage?.url,
      imageSize: welcomeConfig.avatarConfig?.size || 120,
      fontSize: welcomeConfig.textConfig?.size || 24,
      textColor: welcomeConfig.textConfig?.color || '#ffffff',
      welcomeText: welcomeConfig.textConfig?.welcomeText || 'Welcome',
      userText: welcomeConfig.textConfig?.usernameText || '{user}'
    };
    
    const imageBuffer = await generateWelcomeImage(config, userAvatarUrl, member.user.username);
    
    // Create attachment
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'welcome.png' });
    
    // Create welcome message with custom configuration
    let welcomeMessage = '';
    
    // If mentionUser is enabled, send a message
    if (welcomeConfig.mentionUser) {
      // Start with the mention
      welcomeMessage = `${member.user}`;
      
      // Add custom message if provided
      if (welcomeConfig.customMessage && welcomeConfig.customMessage.trim()) {
        welcomeMessage += ` ${welcomeConfig.customMessage}`;
      }
      
      // Send the welcome message with image
      await channel.send({ content: welcomeMessage, files: [attachment] });
      console.log(`✅ Welcome message with image sent for ${member.user.tag}: "${welcomeMessage}"`);
      
      // Log welcome message sent
      await LogManager.logWelcomeSent(member.guild.id, member, channel.name);
    } else {
      // If mentionUser is disabled, send only the image
      await channel.send({ files: [attachment] });
      console.log(`✅ Welcome image sent for ${member.user.tag} (no text message)`);
      
      // Log welcome message sent
      await LogManager.logWelcomeSent(member.guild.id, member, channel.name);
    }
    
    // Update statistics
    welcomeConfig.stats.totalSent += 1;
    welcomeConfig.stats.lastSent = new Date();
    await welcomeConfig.save();
    
  } catch (error) {
    handleError(error, 'welcome message handler');
  }
}

/**
 * Handle leave message
 * @param {GuildMember} member - Discord guild member
 * @param {Object} welcomeConfig - Welcome configuration
 */
async function handleLeaveMessage(member, welcomeConfig) {
  try {
    const channel = member.guild.channels.cache.get(welcomeConfig.channelId);
    if (!channel) {
      console.log(`❌ Leave channel not found: ${welcomeConfig.channelId}`);
      return;
    }
    
    const leaveText = welcomeConfig.customMessage.replace('{user}', member.user.tag)
                                               .replace('{server}', member.guild.name)
                                               .replace('{memberCount}', member.guild.memberCount);
    
    await channel.send(leaveText);
    
  } catch (error) {
    handleError(error, 'leave message handler');
  }
}

/**
 * Handle boost message
 * @param {GuildMember} member - Discord guild member
 * @param {Object} welcomeConfig - Welcome configuration
 */
async function handleBoostMessage(member, welcomeConfig) {
  try {
    const channel = member.guild.channels.cache.get(welcomeConfig.channelId);
    if (!channel) {
      console.log(`❌ Boost channel not found: ${welcomeConfig.channelId}`);
      return;
    }
    
    const boostText = welcomeConfig.customMessage.replace('{user}', member.user.toString())
                                               .replace('{server}', member.guild.name);
    
    await channel.send(boostText);
    
  } catch (error) {
    handleError(error, 'boost message handler');
  }
}

/**
 * Handle join roles assignment
 * @param {GuildMember} member - Discord guild member
 * @param {Object} joinRoles - Join roles configuration
 */
async function handleJoinRoles(member, joinRoles) {
  try {
    console.log(`🎭 Starting join roles assignment for ${member.user.tag} in ${member.guild.name}`);
    console.log(`🔍 Join roles config:`, JSON.stringify(joinRoles, null, 2));
    
    const rolesToAssign = [];
    
    // Check if user is a bot
    const isBot = member.user.bot;
    console.log(`🤖 User ${member.user.tag} is bot:`, isBot);
    
    if (isBot) {
      // Assign bot roles
      if (joinRoles.bot && joinRoles.bot.length > 0) {
        rolesToAssign.push(...joinRoles.bot);
        console.log(`🤖 User is a bot, will assign ${joinRoles.bot.length} bot roles:`, joinRoles.bot.map(r => r.name));
      } else {
        console.log(`🤖 User is a bot but no bot roles configured`);
      }
    } else {
      // Assign general roles to regular users
      if (joinRoles.general && joinRoles.general.length > 0) {
        rolesToAssign.push(...joinRoles.general);
        console.log(`👤 User is regular, will assign ${joinRoles.general.length} general roles:`, joinRoles.general.map(r => r.name));
      } else {
        console.log(`👤 User is regular but no general roles configured`);
      }
    }
    
    // Assign the roles
    if (rolesToAssign.length > 0) {
      const roleIds = rolesToAssign.map(role => role.id);
      console.log(`🎭 Attempting to assign roles to ${member.user.tag}:`, roleIds);
      console.log(`🎭 Role names:`, rolesToAssign.map(r => r.name));
      
      // Check bot permissions
      const botMember = member.guild.members.me;
      console.log(`🔧 Bot permissions:`, botMember.permissions.toArray());
      console.log(`🔧 Bot can manage roles:`, botMember.permissions.has('ManageRoles'));
      
      try {
        await member.roles.add(roleIds, 'Auto-assigned join roles');
        console.log(`✅ Successfully assigned ${rolesToAssign.length} roles to ${member.user.tag}`);
        
        // Log role assignments
        for (const role of rolesToAssign) {
          await LogManager.logRoleAssignment(member.guild.id, member, role, 'Auto-assigned join role');
        }
      } catch (roleError) {
        console.error(`❌ Error assigning roles to ${member.user.tag}:`, roleError.message);
        console.error(`❌ Full error:`, roleError);
        
        // Log which roles failed
        for (const roleId of roleIds) {
          try {
            await member.roles.add(roleId, 'Auto-assigned join role');
            console.log(`✅ Successfully assigned role ${roleId} to ${member.user.tag}`);
          } catch (singleRoleError) {
            console.error(`❌ Failed to assign role ${roleId} to ${member.user.tag}:`, singleRoleError.message);
          }
        }
      }
    } else {
      console.log(`ℹ️ No join roles to assign for ${member.user.tag} (${isBot ? 'bot' : 'user'})`);
    }
  } catch (error) {
    handleError(error, 'join roles handler');
  }
}

module.exports = {
  handleMemberAdd,
  handleMemberRemove,
  handleMemberUpdate
}; 