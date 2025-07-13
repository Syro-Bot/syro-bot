/**
 * Bot Event Handler
 * 
 * Handles Discord bot events like guild join/leave, ready, etc.
 * Manages data retention when bot leaves servers.
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 */

const logger = require('../utils/logger');
const dataRetentionService = require('../services/dataRetentionService');

/**
 * Initialize bot event handlers
 */
function initializeBotHandlers(client) {
  // Bot ready event
  client.once('ready', () => {
    logger.bot(`🤖 Bot logged in as ${client.user.tag}`);
    logger.bot(`📊 Serving ${client.guilds.cache.size} servers`);
    logger.bot(`👥 Total users: ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)}`);
    
    // Log each server
    client.guilds.cache.forEach(guild => {
      logger.bot(`  - ${guild.name}: ${guild.memberCount} members`);
    });
    
    // Start data retention service
    dataRetentionService.start();
    logger.info('🗑️ Data retention service started');
  });

  // Bot joins a server
  client.on('guildCreate', async (guild) => {
    try {
      logger.bot(`🎉 Bot joined server: ${guild.name} (${guild.id})`);
      logger.bot(`👥 Server has ${guild.memberCount} members`);
      
      // Log server details
      logger.bot(`  - Owner: ${guild.ownerId}`);
      logger.bot(`  - Created: ${guild.createdAt.toISOString()}`);
      logger.bot(`  - Features: ${guild.features.join(', ') || 'None'}`);
      
    } catch (error) {
      logger.error(`❌ Error handling guild join for ${guild.id}:`, error);
    }
  });

  // Bot leaves a server
  client.on('guildDelete', async (guild) => {
    try {
      logger.bot(`👋 Bot left server: ${guild.name} (${guild.id})`);
      
      // Handle data retention
      await dataRetentionService.handleBotLeave(guild.id);
      
      logger.bot(`✅ Data retention handled for server ${guild.id}`);
      
    } catch (error) {
      logger.error(`❌ Error handling guild leave for ${guild.id}:`, error);
    }
  });

  // Bot is removed from a server
  client.on('guildUnavailable', async (guild) => {
    try {
      logger.bot(`⚠️ Server unavailable: ${guild.name} (${guild.id})`);
      
      // This event is triggered when the bot loses access to a guild
      // We don't handle data retention here as it might be temporary
      // Data retention is handled in guildDelete event
      
    } catch (error) {
      logger.error(`❌ Error handling guild unavailable for ${guild.id}:`, error);
    }
  });

  // Bot error handling
  client.on('error', (error) => {
    logger.errorWithContext(error, { context: 'Discord client error' });
  });

  // Bot disconnect handling
  client.on('disconnect', () => {
    logger.warn('Discord bot disconnected');
    
    // Stop data retention service
    dataRetentionService.stop();
    logger.info('🛑 Data retention service stopped');
  });

  // Bot reconnect handling
  client.on('reconnecting', () => {
    logger.info('Discord bot reconnecting...');
  });

  // Bot resume handling
  client.on('resume', (replayed) => {
    logger.info(`Discord bot resumed connection, replayed ${replayed} events`);
    
    // Restart data retention service
    dataRetentionService.start();
    logger.info('🔄 Data retention service restarted');
  });

  // Rate limit handling
  client.on('rateLimit', (info) => {
    logger.warn(`Rate limit hit: ${info.method} ${info.path} - ${info.timeout}ms`);
  });

  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    client.on('debug', (info) => {
      logger.debug(`Discord debug: ${info}`);
    });
  }

  logger.info('✅ Bot event handlers initialized');
}

/**
 * Get bot statistics
 */
function getBotStats(client) {
  const guilds = client.guilds.cache;
  const totalMembers = guilds.reduce((acc, guild) => acc + guild.memberCount, 0);
  
  return {
    guildCount: guilds.size,
    totalMembers,
    averageMembersPerGuild: Math.round(totalMembers / guilds.size),
    uptime: client.uptime,
    ping: client.ws.ping,
    status: client.ws.status
  };
}

/**
 * Get guild information
 */
function getGuildInfo(guildId, client) {
  const guild = client.guilds.cache.get(guildId);
  
  if (!guild) {
    return null;
  }
  
  return {
    id: guild.id,
    name: guild.name,
    icon: guild.icon,
    memberCount: guild.memberCount,
    ownerId: guild.ownerId,
    createdAt: guild.createdAt,
    features: guild.features,
    premiumTier: guild.premiumTier,
    premiumSubscriptionCount: guild.premiumSubscriptionCount
  };
}

/**
 * Check if bot is in a guild
 */
function isBotInGuild(guildId, client) {
  return client.guilds.cache.has(guildId);
}

module.exports = {
  initializeBotHandlers,
  getBotStats,
  getGuildInfo,
  isBotInGuild
}; 