/**
 * Syro Discord Bot - Main Entry Point
 * 
 * This is the main Discord bot that handles automoderation, raid protection,
 * welcome messages, and server management features. It connects to Discord
 * via the Discord.js library and manages server configurations stored in MongoDB.
 * 
 * Features:
 * - Spam detection and prevention
 * - Raid protection (join, channel, role raids)
 * - Automatic channel cleanup during raids
 * - Server lockdown management
 * - Welcome message handling
 * - Administrative commands
 * 
 * @author Syro Development Team
 * @version 1.0.0
 * @requires discord.js
 * @requires mongoose
 * @requires dotenv
 */

require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, AttachmentBuilder } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const { createCanvas, loadImage, registerFont } = require('canvas');
const ServerConfig = require('./models/ServerConfig');
const WelcomeConfig = require('./models/WelcomeConfig');
const LogManager = require('./utils/logManager');
const { setupMemberCountListeners, updateAllMemberCountChannels } = require('./utils/memberCountUpdater');

// Server configuration cache to reduce database queries
const serverConfigCache = new Map();
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Optimized database queries with caching and indexing
 */

/**
 * Get server configuration with optimized query
 * @param {string} serverId - Discord server ID
 * @returns {Promise<Object>} - Server configuration
 */
async function getServerConfigOptimized(serverId) {
  const cacheKey = serverId;
  const cached = serverConfigCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CONFIG_CACHE_TTL) {
    return cached.config;
  }
  
  try {
    // Use projection to only fetch needed fields
    const config = await ServerConfig.findOne(
      { serverId },
      {
        automodRules: 1,
        welcomeConfig: 1,
        joinRoles: 1,
        memberCountChannels: 1,
        globalAnnouncementChannels: 1
      }
    ).lean(); // Use lean() for better performance
    
    serverConfigCache.set(cacheKey, {
      config: config || null,
      timestamp: Date.now()
    });
    
    return config;
  } catch (error) {
    console.error(`Error fetching server config for ${serverId}:`, error);
    return null;
  }
}

/**
 * Batch update server configurations
 * @param {Array} updates - Array of update operations
 * @returns {Promise<Object>} - Update result
 */
async function batchUpdateServerConfigs(updates) {
  try {
    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { serverId: update.serverId },
        update: { $set: update.data },
        upsert: true
      }
    }));
    
    const result = await ServerConfig.bulkWrite(bulkOps);
    
    // Clear cache for updated servers
    updates.forEach(update => {
      clearServerConfigCache(update.serverId);
    });
    
    return result;
  } catch (error) {
    console.error('Error in batch update:', error);
    throw error;
  }
}

/**
 * Clear server configuration cache
 * @param {string} serverId - Discord server ID (optional, clears all if not provided)
 */
function clearServerConfigCache(serverId = null) {
  if (serverId) {
    serverConfigCache.delete(serverId);
  } else {
    serverConfigCache.clear();
  }
}

/**
 * Setup server config cache cleanup
 */
function setupConfigCacheCleanup() {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of serverConfigCache.entries()) {
      if (now - value.timestamp > CONFIG_CACHE_TTL) {
        serverConfigCache.delete(key);
      }
    }
  }, CONFIG_CACHE_TTL);
  
  console.log('⚙️ Server config cache cleanup configured');
}

/**
 * Discord Client Configuration
 * Sets up the bot with necessary intents to monitor server activity
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,           // Access to guild information
    GatewayIntentBits.GuildMessages,    // Access to message content
    GatewayIntentBits.GuildMembers,     // Access to member information
    GatewayIntentBits.MessageContent,   // Access to message content for spam detection
    GatewayIntentBits.GuildModeration,  // Access to moderation features
  ],
});

/**
 * In-Memory Cache System with Memory Protection
 * Stores temporary data for automoderation and raid detection
 * All caches are cleared automatically based on time windows and size limits
 */
const recentMessages = new Map();    // Tracks recent messages per user for spam detection
const recentJoins = new Map();       // Tracks recent member joins for raid detection
const recentChannels = new Map();    // Tracks recent channel creation for raid detection
const recentRoles = new Map();       // Tracks recent role creation for raid detection
const serverLockdowns = new Map();   // Tracks servers currently in lockdown
const raidChannels = new Map();      // Tracks channels created during raids for cleanup

// Cache size limits to prevent memory leaks
const CACHE_SIZE_LIMITS = {
  recentMessages: 1000,  // Max 1000 user message entries
  recentJoins: 500,      // Max 500 join entries
  recentChannels: 200,   // Max 200 channel entries
  recentRoles: 200,      // Max 200 role entries
  serverLockdowns: 100,  // Max 100 server lockdowns
  raidChannels: 100      // Max 100 raid channel entries
};

// Cache cleanup intervals (in milliseconds)
const CACHE_CLEANUP_INTERVALS = {
  recentMessages: 5 * 60 * 1000,    // 5 minutes
  recentJoins: 10 * 60 * 1000,      // 10 minutes
  recentChannels: 15 * 60 * 1000,   // 15 minutes
  recentRoles: 15 * 60 * 1000,      // 15 minutes
  serverLockdowns: 60 * 60 * 1000,  // 1 hour
  raidChannels: 30 * 60 * 1000      // 30 minutes
};

/**
 * Enhanced Cache Cleanup Utility with Size Limits
 * 
 * Removes old entries from cache maps based on time windows and size limits.
 * This prevents memory leaks and ensures accurate automoderation.
 * 
 * @param {Map} cache - The cache map to clean (recentMessages, recentJoins, etc.)
 * @param {number} timeWindow - Time window in seconds for keeping entries
 * @param {string} cacheName - Name of the cache for size limiting
 */
function cleanupCache(cache, timeWindow, cacheName = 'unknown') {
  const now = Date.now();
  const sizeLimit = CACHE_SIZE_LIMITS[cacheName] || 1000;
  
  // If cache is over size limit, remove oldest entries first
  if (cache.size > sizeLimit) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => {
      const aOldest = Math.min(...a[1].map(entry => entry.timestamp));
      const bOldest = Math.min(...b[1].map(entry => entry.timestamp));
      return aOldest - bOldest;
    });
    
    // Remove oldest entries until we're under the limit
    const toRemove = entries.slice(0, cache.size - sizeLimit);
    toRemove.forEach(([key]) => cache.delete(key));
    
    console.log(`🧹 Cache ${cacheName} size reduced from ${entries.length} to ${cache.size} entries`);
  }
  
  // Remove old entries based on time window
  for (const [key, entries] of cache.entries()) {
    const filteredEntries = entries.filter(entry => now - entry.timestamp < timeWindow * 1000);
    if (filteredEntries.length === 0) {
      cache.delete(key);
    } else {
      cache.set(key, filteredEntries);
    }
  }
}

/**
 * Setup automatic cache cleanup intervals
 */
function setupCacheCleanup() {
  // Cleanup recentMessages every 5 minutes
  setInterval(() => {
    cleanupCache(recentMessages, 300, 'recentMessages'); // 5 minutes
  }, CACHE_CLEANUP_INTERVALS.recentMessages);
  
  // Cleanup recentJoins every 10 minutes
  setInterval(() => {
    cleanupCache(recentJoins, 600, 'recentJoins'); // 10 minutes
  }, CACHE_CLEANUP_INTERVALS.recentJoins);
  
  // Cleanup recentChannels every 15 minutes
  setInterval(() => {
    cleanupCache(recentChannels, 900, 'recentChannels'); // 15 minutes
  }, CACHE_CLEANUP_INTERVALS.recentChannels);
  
  // Cleanup recentRoles every 15 minutes
  setInterval(() => {
    cleanupCache(recentRoles, 900, 'recentRoles'); // 15 minutes
  }, CACHE_CLEANUP_INTERVALS.recentRoles);
  
  // Cleanup raidChannels every 30 minutes
  setInterval(() => {
    cleanupCache(raidChannels, 1800, 'raidChannels'); // 30 minutes
  }, CACHE_CLEANUP_INTERVALS.raidChannels);
  
  console.log('🧹 Cache cleanup intervals configured');
}

/**
 * Get Custom Emoji Function
 * 
 * Retrieves custom emojis from the guild or falls back to default emojis.
 * This allows for server-specific emoji customization.
 * 
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
 * Generate Welcome Image
 * 
 * Creates a custom welcome image using canvas based on user configuration.
 * The image includes background color, text styling, and user avatar.
 * 
 * @param {Object} config - Welcome image configuration from ImageConfig.tsx
 * @param {string} userAvatarUrl - URL of the user's avatar
 * @param {string} username - Username to display
 * @returns {Promise<Buffer>} - Image buffer to send to Discord
 */
async function generateWelcomeImage(config, userAvatarUrl, username) {
  try {
    // Security validations
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid config object provided');
    }
    
    if (!userAvatarUrl || typeof userAvatarUrl !== 'string') {
      throw new Error('Invalid avatar URL provided');
    }
    
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username provided');
    }
    
    // Validate URL format
    try {
      new URL(userAvatarUrl);
    } catch (error) {
      throw new Error('Invalid avatar URL format');
    }
    
    // Size limits for memory protection
    const MAX_IMAGE_SIZE = 1024; // Max 1024px
    const MAX_CANVAS_SIZE = 1200; // Max 1200px canvas
    
    // Validate and limit canvas dimensions
    const canvasWidth = Math.min(config.width || 600, MAX_CANVAS_SIZE);
    const canvasHeight = Math.min(config.height || 300, MAX_CANVAS_SIZE);
    
    // Validate and limit avatar size
    const avatarSize = Math.min(config.imageSize || 120, MAX_IMAGE_SIZE);
    
    // Create canvas with validated dimensions
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    
    // Set background color with validation
    const backgroundColor = config.backgroundColor || '#1a1a1a';
    if (!/^#[0-9A-F]{6}$/i.test(backgroundColor)) {
      throw new Error('Invalid background color format');
    }
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Load and draw background image if provided (with size limits)
    if (config.backgroundImage) {
      try {
        const bgImage = await loadImage(config.backgroundImage);
        
        // Limit background image size
        const bgWidth = Math.min(bgImage.width, MAX_IMAGE_SIZE);
        const bgHeight = Math.min(bgImage.height, MAX_IMAGE_SIZE);
        
        ctx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);
      } catch (error) {
        console.log('Error loading background image, using color only:', error.message);
      }
    }
    
    // Load user avatar with size limits
    let avatarImage;
    try {
      console.log('Loading avatar from URL:', userAvatarUrl);
      avatarImage = await loadImage(userAvatarUrl);
      
      // Validate avatar dimensions
      if (avatarImage.width > MAX_IMAGE_SIZE || avatarImage.height > MAX_IMAGE_SIZE) {
        console.log('Avatar too large, resizing...');
        // Create a temporary canvas to resize
        const tempCanvas = createCanvas(MAX_IMAGE_SIZE, MAX_IMAGE_SIZE);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(avatarImage, 0, 0, MAX_IMAGE_SIZE, MAX_IMAGE_SIZE);
        avatarImage = tempCanvas;
      }
      
      console.log('Avatar loaded successfully');
    } catch (error) {
      console.log('Error loading avatar, trying alternative URL:', error.message);
      // Try alternative avatar URL format
      try {
        const alternativeUrl = userAvatarUrl.replace('?size=512', '?size=256');
        avatarImage = await loadImage(alternativeUrl);
        console.log('Avatar loaded with alternative URL');
      } catch (altError) {
        console.log('Error with alternative URL, using default:', altError.message);
        // Use default avatar
        try {
          avatarImage = await loadImage('https://cdn.discordapp.com/embed/avatars/0.png');
          console.log('Default avatar loaded');
        } catch (defaultError) {
          console.log('Error loading default avatar:', defaultError.message);
          // Create a simple colored circle as fallback
          const avatarX = (canvasWidth - avatarSize) / 2;
          const avatarY = (canvasHeight - avatarSize) / 2;
          ctx.fillStyle = '#7289da';
          ctx.beginPath();
          ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
          ctx.fill();
          return canvas.toBuffer('image/png');
        }
      }
    }
    
    // Draw user avatar in center with validated position
    const avatarX = (canvasWidth - avatarSize) / 2;
    const avatarY = (canvasHeight - avatarSize) / 2;
    
    // Create circular avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
    
    // Configure text styling with validation
    const fontSize = Math.min(config.fontSize || 24, 72); // Max 72px font
    ctx.font = `bold ${fontSize}px Arial`;
    
    // Validate text color
    const textColor = config.textColor || '#ffffff';
    if (!/^#[0-9A-F]{6}$/i.test(textColor)) {
      throw new Error('Invalid text color format');
    }
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    
    // Draw welcome text at top (16px from top, matching frontend top-4)
    const welcomeText = config.welcomeText || 'Welcome';
    ctx.fillText(welcomeText, canvasWidth / 2, 16 + fontSize);
    
    // Draw user text at bottom (32px from bottom, slightly higher than frontend)
    const userText = (config.userText || '{user}').replace('{user}', username);
    ctx.font = `bold ${fontSize * 0.8}px Arial`;
    ctx.fillText(userText, canvasWidth / 2, canvasHeight - 32);
    
    // Return the image buffer
    return canvas.toBuffer('image/png');
  } catch (error) {
    console.error('Error generating welcome image:', error);
    throw error;
  }
}

/**
 * Secure Server Lockdown Management
 * 
 * Applies emergency lockdown to a Discord server when raids are detected.
 * This function restricts server permissions, cleans up raid-created content,
 * and automatically restores permissions after the specified duration.
 * 
 * @param {Guild} guild - Discord guild/server to lockdown
 * @param {number} duration - Lockdown duration in minutes
 * @param {string} raidType - Type of raid detected ('join', 'channel', 'role', 'general')
 * @returns {Promise<void>}
 */
async function applyLockdown(guild, duration, raidType = 'general') {
  try {
    console.log(`🔒 applyLockdown iniciado para ${guild.name} - raidType: ${raidType}, duration: ${duration}`);
    
    // Security validations
    if (!guild || typeof guild !== 'object') {
      console.error('❌ Invalid guild object provided to applyLockdown');
      return;
    }
    
    // Validate duration (max 1440 minutes = 24 hours)
    if (!duration || duration < 1 || duration > 1440) {
      console.error(`❌ Invalid lockdown duration: ${duration}. Must be between 1 and 1440 minutes.`);
      return;
    }
    
    // Validate raid type
    const validRaidTypes = ['join', 'channel', 'role', 'general'];
    if (!validRaidTypes.includes(raidType)) {
      console.error(`❌ Invalid raid type: ${raidType}. Must be one of: ${validRaidTypes.join(', ')}`);
      return;
    }
    
    // Check if already in lockdown
    if (serverLockdowns.has(guild.id)) {
      console.log(`⚠️ Servidor ${guild.name} ya está en lockdown`);
      return;
    }
    
    // Validate bot permissions before applying lockdown
    const botMember = guild.members.me;
    if (!botMember) {
      console.error(`❌ Bot not found in guild ${guild.name}`);
      return;
    }
    
    const requiredPermissions = [
      PermissionsBitField.Flags.ManageRoles,
      PermissionsBitField.Flags.ManageChannels,
      PermissionsBitField.Flags.SendMessages
    ];
    
    const missingPermissions = requiredPermissions.filter(perm => !botMember.permissions.has(perm));
    if (missingPermissions.length > 0) {
      console.error(`❌ Bot missing required permissions in ${guild.name}:`, missingPermissions);
      return;
    }
    
    console.log(`🔒 Aplicando lockdown a ${guild.name}`);
    serverLockdowns.set(guild.id, { startTime: Date.now(), duration, raidType });
    
    // Log lockdown started
    await LogManager.logLockdownStarted(guild.id, `Raid detection: ${raidType}`, duration);
    
    try {
      console.log(`🔧 Verificando permisos del bot en ${guild.name}`);
      console.log(`🔧 Permisos del bot:`, botMember.permissions.toArray());
      
      // Obtener el rol @everyone
      const everyoneRole = guild.roles.everyone;
      
      // Restringir permisos para @everyone (más restrictivo)
      await everyoneRole.setPermissions([
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.ReadMessageHistory
      ]);
      
      // Restringir permisos en canales específicos también
      const channelsToRestrict = guild.channels.cache.filter(ch => 
        ch.type === 0 && // Solo canales de texto
        ch.permissionsFor(botMember).has(PermissionsBitField.Flags.ManageChannels)
      );
      
      for (const [_, channel] of channelsToRestrict) {
        try {
          await channel.permissionOverwrites.edit(everyoneRole, {
            SendMessages: false,
            CreatePublicThreads: false,
            CreatePrivateThreads: false,
            SendMessagesInThreads: false,
            AttachFiles: false,
            EmbedLinks: false,
            UseExternalEmojis: false,
            AddReactions: false
          });
        } catch (error) {
          console.error(`Error restringiendo canal ${channel.name}:`, error);
        }
      }
      
      // Eliminar canales creados durante el raid si es un channel raid
      if (raidType === 'channel' && raidChannels.has(guild.id)) {
        const channelsToDelete = raidChannels.get(guild.id);
        console.log(`🗑️ Eliminando ${channelsToDelete.length} canales creados durante el raid`);
        console.log(`📋 Canales a eliminar:`, channelsToDelete);
        
        let deletedCount = 0;
        for (const channelId of channelsToDelete) {
          try {
            const channel = guild.channels.cache.get(channelId);
            if (channel) {
              console.log(`🗑️ Intentando eliminar canal: ${channel.name} (${channelId})`);
              await channel.delete('Canal eliminado por raid detection');
              console.log(`✅ Canal eliminado: ${channel.name}`);
              deletedCount++;
            } else {
              console.log(`❌ Canal no encontrado en cache: ${channelId}`);
            }
          } catch (error) {
            console.error(`❌ Error eliminando canal ${channelId}:`, error);
          }
        }
        console.log(`📊 Total de canales eliminados: ${deletedCount}/${channelsToDelete.length}`);
        raidChannels.delete(guild.id);
      } else {
        console.log(`ℹ️ No se eliminaron canales - raidType: ${raidType}, tiene raidChannels: ${raidChannels.has(guild.id)}`);
      }
      
      // Enviar alerta
      const alertChannel = guild.systemChannel || 
                          guild.channels.cache.find(ch => ch.type === 0 && ch.permissionsFor(botMember).has(PermissionsBitField.Flags.SendMessages));
      
      if (alertChannel) {
        const raidEmoji = getCustomEmoji(guild, 'alertblue', '🚨');
        const embed = new EmbedBuilder()
          .setTitle(`${raidEmoji} RAID DETECTADO`)
          .setDescription(`Se ha detectado actividad sospechosa (${raidType}). El servidor ha sido puesto en lockdown por ${duration} minutos.`)
          .setColor(0xFF0000)
          .setTimestamp();
        
        await alertChannel.send({ embeds: [embed] });
      }
      
      // Auto-unlock después del tiempo especificado
      const unlockTimeout = setTimeout(async () => {
        try {
          await everyoneRole.setPermissions([
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.UseExternalEmojis,
            PermissionsBitField.Flags.AddReactions
          ]);
          
          // Restaurar permisos en canales específicos
          const channelsToRestore = guild.channels.cache.filter(ch => 
            ch.type === 0 && // Solo canales de texto
            ch.permissionsFor(botMember).has(PermissionsBitField.Flags.ManageChannels)
          );
          
          for (const [_, channel] of channelsToRestore) {
            try {
              await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: null,
                CreatePublicThreads: null,
                CreatePrivateThreads: null,
                SendMessagesInThreads: null,
                AttachFiles: null,
                EmbedLinks: null,
                UseExternalEmojis: null,
                AddReactions: null
              });
            } catch (error) {
              console.error(`Error restaurando canal ${channel.name}:`, error);
            }
          }
          
          serverLockdowns.delete(guild.id);
          
          // Log lockdown ended
          await LogManager.logLockdownEnded(guild.id);
          
          if (alertChannel) {
            const embed = new EmbedBuilder()
              .setTitle('✅ LOCKDOWN TERMINADO')
              .setDescription('El servidor ha sido desbloqueado automáticamente.')
              .setColor(0x00FF00)
              .setTimestamp();
            
            await alertChannel.send({ embeds: [embed] });
          }
        } catch (error) {
          console.error('Error al desbloquear servidor:', error);
          serverLockdowns.delete(guild.id);
        }
      }, duration * 60 * 1000);
      
      // Store timeout reference for potential cancellation
      serverLockdowns.set(guild.id, { 
        startTime: Date.now(), 
        duration, 
        raidType, 
        unlockTimeout 
      });
      
    } catch (error) {
      console.error('Error al aplicar lockdown:', error);
      serverLockdowns.delete(guild.id);
    }
  } catch (error) {
    console.error('Error en applyLockdown:', error);
    serverLockdowns.delete(guild.id);
  }
}

/**
 * Bot Ready Event
 * Fired when the bot successfully connects to Discord
 */
client.once('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  
  // Setup all cache and cleanup systems
  setupCacheCleanup();
  setupConfigCacheCleanup();
  
  // Setup member count listeners
  setupMemberCountListeners(client);
  
  // Update all member count channels on startup
  updateAllMemberCountChannels(client);
  
  console.log('✅ All systems initialized successfully');
});

/**
 * Message Create Event - Spam Detection & Administrative Commands
 * 
 * Monitors all messages in the server for spam detection and handles
 * administrative commands. This consolidated event handler improves
 * performance by processing all message-related logic in one place.
 * 
 * Features:
 * - Spam detection and prevention
 * - Administrative command handling
 * - Optimized performance with single event listener
 */
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  try {
    // ===== SPAM DETECTION =====
    const config = await getServerConfigOptimized(message.guild.id);
    if (config && config.automodRules?.Spam && config.automodRules.Spam.length > 0) {
      const rule = config.automodRules.Spam[0];
      const key = `${message.guild.id}-${message.author.id}`;
      const cooldownKey = `cooldown-${message.guild.id}-${message.author.id}`;
      
      // Verificar si el usuario está en cooldown
      if (recentMessages.has(cooldownKey)) {
        console.log(`⏰ Usuario ${message.author.tag} en cooldown, eliminando mensaje`);
        await message.delete().catch(err => console.log('No se pudo eliminar mensaje en cooldown:', err.message));
        return;
      }
      
      if (!recentMessages.has(key)) {
        recentMessages.set(key, []);
      }
      
      const userMessages = recentMessages.get(key);
      userMessages.push({ timestamp: Date.now() });
      
      // Limpiar mensajes antiguos
      cleanupCache(recentMessages, rule.timeWindow, 'recentMessages');
      
      // Verificar si excede el límite
      if (userMessages.length >= rule.messageCount) {
        console.log(`🚨 SPAM DETECTADO: ${message.author.tag} envió ${userMessages.length} mensajes en ${rule.timeWindow}s`);
        
        let totalDeleted = 0;
        
        try {
          // Eliminar el mensaje actual primero
          await message.delete().catch(err => console.log('No se pudo eliminar mensaje actual:', err.message));
          totalDeleted++;
          
          // Buscar más mensajes del usuario de forma más agresiva
          const now = Date.now();
          const timeWindowMs = rule.timeWindow * 1000;
          
          // Buscar mensajes en múltiples lotes para asegurar que encontramos todos
          let allMessages = [];
          let lastMessageId = null;
          
          // Hacer múltiples fetch para obtener más mensajes
          for (let i = 0; i < 3; i++) {
            const fetchOptions = lastMessageId 
              ? { limit: 100, before: lastMessageId }
              : { limit: 100 };
              
            const messagesBatch = await message.channel.messages.fetch(fetchOptions);
            allMessages = allMessages.concat(Array.from(messagesBatch.values()));
            
            if (messagesBatch.size < 100) break; // No hay más mensajes
            
            lastMessageId = messagesBatch.last().id;
          }
          
          console.log(`🔍 Total de mensajes obtenidos del canal: ${allMessages.length}`);
          
          // Filtrar mensajes del usuario - ser más permisivo con el tiempo
          const userRecentMessages = allMessages.filter(msg => {
            const isFromUser = msg.author.id === message.author.id;
            const age = Math.round((now - msg.createdTimestamp) / 1000);
            
            // Ser más permisivo: considerar recientes mensajes de hasta 60 segundos
            const isRecent = age <= 60;
            const isNotTooOld = (now - msg.createdTimestamp) < (14 * 24 * 60 * 60 * 1000); // Máximo 14 días
            
            if (isFromUser) {
              console.log(`🔍 Mensaje del usuario encontrado: ${msg.id} (hace ${age}s) - Reciente: ${isRecent}, No muy viejo: ${isNotTooOld}`);
            }
            
            return isFromUser && isRecent && isNotTooOld;
          });
          
          console.log(`🔍 Buscando mensajes de ${message.author.tag} en los últimos 60 segundos`);
          console.log(`🗑️ Encontrados ${userRecentMessages.size} mensajes de spam para eliminar`);
          
          // Log detallado de los mensajes encontrados
          userRecentMessages.forEach((msg, index) => {
            const age = Math.round((now - msg.createdTimestamp) / 1000);
            console.log(`  ${index + 1}. Mensaje ${msg.id}: "${msg.content.substring(0, 50)}..." (hace ${age}s)`);
          });
          
          if (userRecentMessages.length > 0) {
            console.log(`🗑️ Intentando eliminar ${userRecentMessages.length} mensajes...`);
            
            // Verificar permisos del bot
            const botPermissions = message.channel.permissionsFor(message.guild.members.me);
            console.log(`🔧 Permisos del bot en el canal:`, botPermissions.toArray());
            
            if (!botPermissions.has(PermissionsBitField.Flags.ManageMessages)) {
              console.error('❌ El bot no tiene permisos para eliminar mensajes en este canal');
              return;
            }
            
            // Ordenar mensajes por timestamp (más recientes primero)
            userRecentMessages.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
            
            // Eliminar en lotes de 10 para evitar límites de Discord
            const batches = [];
            for (let i = 0; i < userRecentMessages.length; i += 10) {
              batches.push(userRecentMessages.slice(i, i + 10));
            }
            
            console.log(`📦 Dividido en ${batches.length} lotes para eliminación`);
            
            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
              const batch = batches[batchIndex];
              console.log(`🔄 Procesando lote ${batchIndex + 1}/${batches.length} con ${batch.length} mensajes`);
              
              try {
                console.log(`🔄 Intentando bulkDelete para lote ${batchIndex + 1} con ${batch.length} mensajes`);
                console.log(`📋 IDs de mensajes en el lote:`, batch.map(msg => msg.id));
                
                await message.channel.bulkDelete(batch);
                totalDeleted += batch.length;
                console.log(`✅ Lote ${batchIndex + 1} eliminado exitosamente: ${batch.length} mensajes`);
              } catch (error) {
                console.error(`❌ Error eliminando lote ${batchIndex + 1}:`, error.message);
                console.error(`❌ Error completo:`, error);
                
                // Si falla bulkDelete, intentar eliminar uno por uno
                console.log(`🔄 Intentando eliminación individual para lote ${batchIndex + 1}`);
                for (const msg of batch) {
                  try {
                    await msg.delete();
                    totalDeleted++;
                    console.log(`✅ Mensaje individual eliminado: ${msg.id}`);
                  } catch (err) {
                    console.log(`❌ No se pudo eliminar mensaje ${msg.id}:`, err.message);
                  }
                }
              }
              
              // Pequeña pausa entre lotes para evitar rate limits
              if (batchIndex < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
            
            console.log(`✅ Total de mensajes eliminados: ${totalDeleted}/${userRecentMessages.length}`);
          } else {
            console.log(`ℹ️ No se encontraron mensajes para eliminar`);
          }
        } catch (error) {
          console.error('Error en eliminación de spam:', error);
        }
        
        // Log spam detection
        await LogManager.logSpamDetected(message.guild.id, message.member, `Sent ${userMessages.length} messages in ${rule.timeWindow} seconds`);
        
        // Limpiar cache del usuario y agregar cooldown
        recentMessages.delete(key);
        
        // Agregar cooldown temporal para evitar spam continuo
        const cooldownKey = `cooldown-${message.guild.id}-${message.author.id}`;
        recentMessages.set(cooldownKey, [{ timestamp: Date.now() }]);
        
        // Limpiar cooldown después de 30 segundos
        setTimeout(() => {
          recentMessages.delete(cooldownKey);
        }, 30000);
        
        // Enviar advertencia con el total de mensajes eliminados
        const trashEmoji = getCustomEmoji(message.guild, 'trash', '🗑️');
        const currentDate = new Date();
        const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear().toString().slice(-2)}`;
        
        const spamEmbed = new EmbedBuilder()
          .setTitle('⚠️ SPAM DETECTADO')
          .setDescription(`${message.author}, has enviado demasiados mensajes rápidamente.\n\n${trashEmoji} **Mensajes eliminados:** ${totalDeleted} mensajes\n\n*hoy a las ${currentDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${formattedDate}*`)
          .setColor(0xFFA500);
        
        await message.channel.send({ embeds: [spamEmbed] });
      }
    }
    
    // ===== ADMINISTRATIVE COMMANDS =====
    // Solo procesar comandos si el usuario es administrador
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return;
    }
    
    // Comando !unlock
    if (message.content === '!unlock') {
      // Check rate limiting
      if (isOnCooldown(message.author.id, '!unlock')) {
        await message.channel.send('⏰ Debes esperar antes de usar este comando nuevamente.');
        return;
      }
      
      setCooldown(message.author.id, '!unlock');
      
      try {
        const guild = message.guild;
        const everyoneRole = guild.roles.everyone;
        
        await everyoneRole.setPermissions([
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks,
          PermissionsBitField.Flags.UseExternalEmojis,
          PermissionsBitField.Flags.AddReactions
        ]);
        
        // Restaurar permisos en canales específicos
        const channelsToRestore = guild.channels.cache.filter(ch => 
          ch.type === 0 && // Solo canales de texto
          ch.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.ManageChannels)
        );
        
        for (const [_, channel] of channelsToRestore) {
          try {
            await channel.permissionOverwrites.edit(everyoneRole, {
              SendMessages: null,
              CreatePublicThreads: null,
              CreatePrivateThreads: null,
              SendMessagesInThreads: null,
              AttachFiles: null,
              EmbedLinks: null,
              UseExternalEmojis: null,
              AddReactions: null
            });
          } catch (error) {
            console.error(`Error restaurando canal ${channel.name}:`, error);
          }
        }
        
        serverLockdowns.delete(guild.id);
        
        const embed = new EmbedBuilder()
          .setTitle('✅ SERVIDOR DESBLOQUEADO')
          .setDescription('El servidor ha sido desbloqueado manualmente por un administrador.')
          .setColor(0x00FF00)
          .setTimestamp();
        
        await message.channel.send({ embeds: [embed] });
        
      } catch (error) {
        console.error('Error al desbloquear manualmente:', error);
        await message.channel.send('❌ Error al desbloquear el servidor.');
      }
    }
    
    // Comando !cleanraid
    if (message.content === '!cleanraid') {
      // Check rate limiting
      if (isOnCooldown(message.author.id, '!cleanraid')) {
        await message.channel.send('⏰ Debes esperar antes de usar este comando nuevamente.');
        return;
      }
      
      setCooldown(message.author.id, '!cleanraid');
      
      try {
        const guild = message.guild;
        console.log(`🧹 Comando cleanraid ejecutado por ${message.author.tag} en ${guild.name}`);
        
        if (raidChannels.has(guild.id)) {
          const channelsToDelete = raidChannels.get(guild.id);
          console.log(`📋 Canales en raidChannels:`, channelsToDelete);
          let deletedCount = 0;
          
          for (const channelId of channelsToDelete) {
            try {
              const channel = guild.channels.cache.get(channelId);
              if (channel) {
                console.log(`🗑️ Eliminando canal: ${channel.name} (${channelId})`);
                await channel.delete('Canal eliminado manualmente por raid');
                console.log(`✅ Canal eliminado: ${channel.name}`);
                deletedCount++;
              } else {
                console.log(`❌ Canal no encontrado: ${channelId}`);
              }
            } catch (error) {
              console.error(`❌ Error eliminando canal ${channelId}:`, error);
            }
          }
          
          raidChannels.delete(guild.id);
          
          const embed = new EmbedBuilder()
            .setTitle('🧹 LIMPIEZA DE RAID COMPLETADA')
            .setDescription(`Se eliminaron ${deletedCount} canales creados durante el raid.`)
            .setColor(0x00FF00)
            .setTimestamp();
          
          await message.channel.send({ embeds: [embed] });
        } else {
          console.log(`ℹ️ No hay canales de raid para limpiar en ${guild.name}`);
          await message.channel.send('✅ No hay canales de raid para limpiar.');
        }
        
      } catch (error) {
        console.error('Error al limpiar canales de raid:', error);
        await message.channel.send('❌ Error al limpiar canales de raid.');
      }
    }
    
    // Comando !raidstatus
    if (message.content === '!raidstatus') {
      // Check rate limiting
      if (isOnCooldown(message.author.id, '!raidstatus')) {
        await message.channel.send('⏰ Debes esperar antes de usar este comando nuevamente.');
        return;
      }
      
      setCooldown(message.author.id, '!raidstatus');
      
      try {
        const guild = message.guild;
        console.log(`📊 Comando raidstatus ejecutado por ${message.author.tag} en ${guild.name}`);
        
        const hasRaidChannels = raidChannels.has(guild.id);
        const raidChannelsList = hasRaidChannels ? raidChannels.get(guild.id) : [];
        const isLocked = serverLockdowns.has(guild.id);
        
        console.log(`📊 Estado del servidor:`, {
          hasRaidChannels,
          raidChannelsCount: raidChannelsList.length,
          isLocked,
          raidChannels: raidChannelsList
        });
        
        const adminEmoji = getCustomEmoji(guild, 'Admin', '📋');
        const lockedEmoji = getCustomEmoji(guild, 'locked', '🔒');
        const unlockEmoji = getCustomEmoji(guild, 'unlock', '🔓');
        
        // Determinar el emoji del título según el estado
        const statusEmoji = isLocked ? lockedEmoji : unlockEmoji;
        
        const embed = new EmbedBuilder()
          .setTitle('📊 ESTADO DE RAID')
          .setDescription(`**Servidor:** ${guild.name}`)
          .addFields(
            { name: `${statusEmoji} Lockdown`, value: isLocked ? `${lockedEmoji} Activo` : `${unlockEmoji} Inactivo`, inline: true },
            { name: `${adminEmoji} Canales de Raid`, value: hasRaidChannels ? `${raidChannelsList.length} canales` : 'Ninguno', inline: true },
            { name: '🆔 IDs de Canales', value: hasRaidChannels ? raidChannelsList.join(', ') : 'N/A', inline: false }
          )
          .setColor(0x0099FF)
          .setTimestamp();
        
        await message.channel.send({ embeds: [embed] });
        
      } catch (error) {
        console.error('Error al mostrar estado de raid:', error);
        await message.channel.send('❌ Error al mostrar estado de raid.');
      }
    }
    
    // Comando xnuke
    if (message.content === 'xnuke') {
      // Check rate limiting
      if (isOnCooldown(message.author.id, 'xnuke')) {
        await message.channel.send('⏰ Debes esperar antes de usar este comando nuevamente.');
        return;
      }
      
      setCooldown(message.author.id, 'xnuke');
      
      try {
        const guild = message.guild;
        const channel = message.channel;
        const user = message.author;
        
        console.log(`💥 Nuke command executed by ${user.tag} in ${channel.name} (${guild.name})`);
        
        // Verify it's a text channel
        if (channel.type !== 0) {
          await message.channel.send('❌ Only text channels can be nuked.');
          return;
        }
        
        // Verify bot permissions
        if (!channel.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.ManageChannels)) {
          await message.channel.send('❌ I don\'t have permissions to manage this channel.');
          return;
        }
        
        // Send confirmation message
        const confirmEmbed = new EmbedBuilder()
          .setTitle('💥 NUKE CONFIRMATION')
          .setDescription(`Are you sure you want to nuke the channel **#${channel.name}**?\n\n⚠️ **This action will completely delete the channel and create a new one with the same name.**\n\nAll messages will be permanently lost.\n\nType \`xconfirmnuke\` within the next 30 seconds to confirm.`)
          .setColor(0xFF0000)
          .setTimestamp();
        
        await message.channel.send({ embeds: [confirmEmbed] });
        
        // Crear un filtro para esperar la confirmación
        const filter = m => m.author.id === user.id && m.content === 'xconfirmnuke';
        const collector = message.channel.createMessageCollector({ filter, time: 30000, max: 1 });
        
        collector.on('collect', async (confirmMessage) => {
          try {
            // Guardar información del canal antes de eliminarlo
            const channelInfo = {
              name: channel.name,
              topic: channel.topic,
              nsfw: channel.nsfw,
              parentId: channel.parentId,
              position: channel.position,
              rateLimitPerUser: channel.rateLimitPerUser,
              permissionOverwrites: channel.permissionOverwrites.cache.map(perm => ({
                id: perm.id,
                type: perm.type,
                allow: perm.allow.toArray(),
                deny: perm.deny.toArray()
              }))
            };
            
            // Eliminar el canal
            await channel.delete('Nuke command executed by ' + user.tag);
            
            // Crear el nuevo canal con la misma configuración
            const newChannel = await guild.channels.create({
              name: channelInfo.name,
              type: 0, // Text channel
              topic: channelInfo.topic,
              nsfw: channelInfo.nsfw,
              parent: channelInfo.parentId,
              position: channelInfo.position,
              rateLimitPerUser: channelInfo.rateLimitPerUser,
              reason: 'Canal recreado después de nuke'
            });
            
            // Restaurar permisos
            for (const perm of channelInfo.permissionOverwrites) {
              await newChannel.permissionOverwrites.create(perm.id, {
                allow: perm.allow,
                deny: perm.deny
              });
            }
            
            // Send confirmation message to the new channel
            const successEmbed = new EmbedBuilder()
              .setTitle('💥 Channel Nuked')
              .setDescription('This channel has been completely deleted and recreated.')
              .addFields(
                { name: '🕐 Timestamp', value: new Date().toLocaleString('en-US', {
                  timeZone: 'America/New_York',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                }), inline: true },
                { name: '👤 Executed by', value: user.tag, inline: true }
              )
              .setColor(0x00FF00)
              .setTimestamp();
            
            await newChannel.send({ embeds: [successEmbed] });
            
            // Log the nuke action
            await LogManager.logChannelNuke(guild.id, channelInfo.name, newChannel.id, user.tag);
            
          } catch (error) {
            console.error('Error executing nuke command:', error);
            // Cannot send message to original channel because it was deleted
            // Try to send to first available channel
            try {
              const firstChannel = guild.channels.cache.find(ch => ch.type === 0);
              if (firstChannel) {
                await firstChannel.send('❌ Error nuking the channel. Check permissions and try again.');
              }
            } catch (sendError) {
              console.error('Error sending error message:', sendError);
            }
          }
        });
        
        collector.on('end', (collected) => {
          if (collected.size === 0) {
            message.channel.send('⏰ Confirmation time expired. The nuke has been cancelled.');
          }
        });
        
      } catch (error) {
        console.error('Error in nuke command:', error);
        await message.channel.send('❌ Error processing the nuke command.');
      }
    }
    
    // Comando xpurge
    if (message.content.startsWith('xpurge')) {
      try {
        const guild = message.guild;
        const args = message.content.split(' ');
        let amount = 10; // Por defecto 10 mensajes
        
        // Si se especifica una cantidad
        if (args.length > 1) {
          const specifiedAmount = parseInt(args[1]);
          if (!isNaN(specifiedAmount) && specifiedAmount > 0) {
            amount = Math.min(specifiedAmount, 50); // Máximo 50 mensajes
          }
        }
        
        console.log(`🧹 Comando xpurge ejecutado por ${message.author.tag} en ${guild.name} - Cantidad: ${amount}`);
        
        // Verificar permisos del bot
        if (!message.channel.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.ManageMessages)) {
          await message.channel.send('❌ No tengo permisos para eliminar mensajes en este canal.');
          return;
        }
        
        // Obtener mensajes y filtrar los que se pueden eliminar
        const messagesToDelete = await message.channel.messages.fetch({ limit: amount + 1 }); // +1 para incluir el comando
        const deletableMessages = messagesToDelete.filter(msg => 
          msg.createdTimestamp > Date.now() - 14 * 24 * 60 * 60 * 1000 && // Solo mensajes de los últimos 14 días
          !msg.pinned // No eliminar mensajes fijados
        );
        
        if (deletableMessages.size === 0) {
          await message.channel.send('❌ No hay mensajes que se puedan eliminar.');
          return;
        }
        
        // Eliminar mensajes
        await message.channel.bulkDelete(deletableMessages);
        
        // Enviar confirmación
        const embed = new EmbedBuilder()
          .setTitle('🧹 PURGA COMPLETADA')
          .setDescription(`Se eliminaron **${deletableMessages.size}** mensajes del canal.`)
          .setColor(0x00FF00)
          .setTimestamp();
        
        const confirmationMsg = await message.channel.send({ embeds: [embed] });
        
        // Eliminar el mensaje de confirmación después de 5 segundos
        setTimeout(async () => {
          try {
            await confirmationMsg.delete();
          } catch (error) {
            console.log('No se pudo eliminar el mensaje de confirmación:', error.message);
          }
        }, 5000);
        
      } catch (error) {
        console.error('Error al purgar mensajes:', error);
        await message.channel.send('❌ Error al eliminar mensajes. Asegúrate de que los mensajes no sean más antiguos de 14 días.');
      }
    }
    
  } catch (error) {
    console.error('Error en messageCreate event:', error);
  }
});

/**
 * Guild Member Add Event - Join Raid Detection & Analytics
 * 
 * Monitors member joins for potential raid attacks and stores join data
 * for analytics and statistics. Detects when many users join in a short
 * time period and applies server lockdown to prevent further damage.
 * 
 * Features:
 * - Tracks join frequency in configurable time windows
 * - Applies automatic server lockdown on raid detection
 * - Stores join data in MongoDB for analytics
 * - Configurable thresholds per server
 */
client.on('guildMemberAdd', async (member) => {
  try {
    console.log(`👋 Member joined: ${member.user.tag} in ${member.guild.name}`);
    console.log(`🎭 JOIN ROLES DEBUG: Event triggered for ${member.user.tag}`);
    
    // Log user join event
    await LogManager.logUserJoin(member.guild.id, member);
    
    // Import the Join model for analytics
    const Join = require('./models/Join');
    
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
    
    // Send welcome message if configured (using MongoDB)
    try {
      const welcomeConfig = await WelcomeConfig.findOne({ serverId: member.guild.id });
      
      if (welcomeConfig && welcomeConfig.enabled && welcomeConfig.channelId) {
        const channel = member.guild.channels.cache.get(welcomeConfig.channelId);
        if (channel) {
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
          
        } else {
          console.log(`❌ Welcome channel not found: ${welcomeConfig.channelId}`);
        }
      } else {
        console.log(`ℹ️ No welcome configuration found or disabled for guild: ${member.guild.name}`);
      }
    } catch (welcomeError) {
      console.error('❌ Error sending welcome message:', welcomeError);
    }
    
    // Assign join roles automatically
    try {
      console.log(`🎭 Starting join roles assignment for ${member.user.tag} in ${member.guild.name}`);
      
      const serverConfig = await ServerConfig.findOne({ serverId: member.guild.id });
      console.log(`🔍 Server config found:`, serverConfig ? 'Yes' : 'No');
      
      if (serverConfig && serverConfig.joinRoles) {
        console.log(`🎭 Join roles config:`, JSON.stringify(serverConfig.joinRoles, null, 2));
        
        const rolesToAssign = [];
        
        // Check if user is a bot
        const isBot = member.user.bot;
        console.log(`🤖 User ${member.user.tag} is bot:`, isBot);
        
        if (isBot) {
          // Assign bot roles
          if (serverConfig.joinRoles.bot && serverConfig.joinRoles.bot.length > 0) {
            rolesToAssign.push(...serverConfig.joinRoles.bot);
            console.log(`🤖 User is a bot, will assign ${serverConfig.joinRoles.bot.length} bot roles:`, serverConfig.joinRoles.bot.map(r => r.name));
          } else {
            console.log(`🤖 User is a bot but no bot roles configured`);
          }
        } else {
          // Assign general roles to regular users
          if (serverConfig.joinRoles.general && serverConfig.joinRoles.general.length > 0) {
            rolesToAssign.push(...serverConfig.joinRoles.general);
            console.log(`👤 User is regular, will assign ${serverConfig.joinRoles.general.length} general roles:`, serverConfig.joinRoles.general.map(r => r.name));
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
          console.log(`🔧 Bot can manage roles:`, botMember.permissions.has(PermissionsBitField.Flags.ManageRoles));
          
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
      } else {
        console.log(`ℹ️ No join roles configuration found for guild: ${member.guild.name}`);
        if (serverConfig) {
          console.log(`🔍 Server config exists but no joinRoles:`, Object.keys(serverConfig));
        }
      }
    } catch (joinRolesError) {
      console.error('❌ Error assigning join roles:', joinRolesError);
      console.error('❌ Full error stack:', joinRolesError.stack);
    }
    
    // Check for raid detection
    const config = await ServerConfig.findOne({ serverId: member.guild.id });
    if (!config || !config.automodRules?.Raids) return;
    
    const raidRules = config.automodRules.Raids.filter(rule => rule.raidType === 'join');
    if (raidRules.length === 0) return;
    
    const rule = raidRules[0]; // Use the first join raid rule
    const key = member.guild.id;
    
    if (!recentJoins.has(key)) {
      recentJoins.set(key, []);
    }
    
    const guildJoins = recentJoins.get(key);
    guildJoins.push({ timestamp: Date.now() });
    
    // Clean up old joins
    cleanupCache(recentJoins, rule.timeWindow, 'recentJoins');
    
    // Check if limit is exceeded
    if (guildJoins.length >= rule.joinCount) {
      console.log(`🚨 JOIN RAID DETECTED! Applying lockdown for ${rule.lockdownDuration} minutes`);
      
      // Log raid detection
      await LogManager.logRaidDetected(member.guild.id, 'join', {
        count: guildJoins.length,
        threshold: rule.joinCount,
        timeWindow: rule.timeWindow,
        lockdownDuration: rule.lockdownDuration
      });
      
      await applyLockdown(member.guild, rule.lockdownDuration, 'join');
      
      // Clear server cache
      recentJoins.delete(key);
    }
    
  } catch (error) {
    console.error('❌ Error in join raid detection:', error);
  }
});



/**
 * Role Create Event - Role Raid Detection
 * 
 * Monitors role creation for potential role spam raids.
 * Detects when many roles are created in a short time and applies
 * server lockdown to prevent further role spam.
 * 
 * Features:
 * - Tracks role creation frequency in time windows
 * - Applies server lockdown on role raid detection
 * - Configurable thresholds per server
 */
client.on('roleCreate', async (role) => {
  try {
    const config = await ServerConfig.findOne({ serverId: role.guild.id });
    if (!config || !config.automodRules?.Raids) return;
    
    const raidRules = config.automodRules.Raids.filter(rule => rule.raidType === 'role');
    if (raidRules.length === 0) return;
    
    const rule = raidRules[0]; // Usar la primera regla de role raid
    const key = role.guild.id;
    
    if (!recentRoles.has(key)) {
      recentRoles.set(key, []);
    }
    
    const guildRoles = recentRoles.get(key);
    guildRoles.push({ timestamp: Date.now() });
    
    // Limpiar roles antiguos
    cleanupCache(recentRoles, rule.timeWindow, 'recentRoles');
    
    // Verificar si excede el límite
    if (guildRoles.length >= rule.roleCount) {
      await applyLockdown(role.guild, rule.lockdownDuration);
      
      // Limpiar cache del servidor
      recentRoles.delete(key);
    }
    
  } catch (error) {
    console.error('Error en role raid detection:', error);
  }
});

/**
 * Guild Member Remove Event
 * Logs when a user leaves the server
 */
client.on('guildMemberRemove', async (member) => {
  try {
    console.log(`👋 Member left: ${member.user.tag} from ${member.guild.name}`);
    
    // Log user leave event
    await LogManager.logUserLeave(member.guild.id, member);
  } catch (error) {
    console.error('❌ Error logging user leave:', error);
  }
});

/**
 * Channel Create Event - Channel Raid Detection
 * 
 * Monitors channel creation for potential channel spam raids.
 * Detects when many channels are created in a short time and applies
 * server lockdown with automatic channel cleanup.
 * 
 * Features:
 * - Tracks channel creation frequency in time windows
 * - Automatically deletes channels created during raids
 * - Applies server lockdown to prevent further channel creation
 * - Configurable thresholds per server
 */
client.on('channelCreate', async (channel) => {
  try {
    console.log(`📝 Canal creado: ${channel.name} en ${channel.guild.name}`);
    
    // Log channel creation
    await LogManager.logChannelCreated(channel.guild.id, channel, 'Unknown');
    
    // Trackear canal para posible eliminación
    const guildId = channel.guild.id;
    if (!raidChannels.has(guildId)) {
      raidChannels.set(guildId, []);
    }
    raidChannels.get(guildId).push(channel.id);
    
    const config = await ServerConfig.findOne({ serverId: guildId });
    if (!config || !config.automodRules?.Raids) {
      console.log(`❌ No hay configuración de raids para ${channel.guild.name}`);
      return;
    }
    
    const raidRules = config.automodRules.Raids.filter(rule => rule.raidType === 'channel');
    if (raidRules.length === 0) {
      console.log(`❌ No hay reglas de channel raid para ${channel.guild.name}`);
      return;
    }
    
    const rule = raidRules[0]; // Usar la primera regla de channel raid
    console.log(`✅ Regla encontrada: ${rule.channelCount} canales en ${rule.timeWindow} segundos`);
    
    const key = guildId;
    
    if (!recentChannels.has(key)) {
      recentChannels.set(key, []);
    }
    
    const guildChannels = recentChannels.get(key);
    guildChannels.push({ timestamp: Date.now() });
    
    console.log(`📊 Canales recientes: ${guildChannels.length}/${rule.channelCount}`);
    
    // Limpiar canales antiguos
    cleanupCache(recentChannels, rule.timeWindow, 'recentChannels');
    
    // Verificar si excede el límite
    if (guildChannels.length >= rule.channelCount) {
      console.log(`🚨 RAID DE CANALES DETECTADO! Aplicando lockdown por ${rule.lockdownDuration} minutos`);
      console.log(`🔧 Llamando applyLockdown con raidType: 'channel'`);
      console.log(`🔧 Parámetros: guild=${channel.guild.name}, duration=${rule.lockdownDuration}, raidType=channel`);
      
      // Log raid detection
      await LogManager.logRaidDetected(channel.guild.id, 'channel', {
        count: guildChannels.length,
        threshold: rule.channelCount,
        timeWindow: rule.timeWindow,
        lockdownDuration: rule.lockdownDuration
      });
      
      await applyLockdown(channel.guild, rule.lockdownDuration, 'channel');
      console.log(`✅ applyLockdown completado exitosamente`);
      
      // Limpiar cache del servidor
      recentChannels.delete(key);
    }
    
  } catch (error) {
    console.error('Error en channel raid detection:', error);
  }
});

/**
 * Role Create Event - Role Raid Detection
 * 
 * Monitors role creation for potential role spam raids.
 * Detects when many roles are created in a short time and applies
 * server lockdown to prevent further role spam.
 * 
 * Features:
 * - Tracks role creation frequency in time windows
 * - Applies server lockdown on role raid detection
 * - Configurable thresholds per server
 */
client.on('roleCreate', async (role) => {
  try {
    const config = await ServerConfig.findOne({ serverId: role.guild.id });
    if (!config || !config.automodRules?.Raids) return;
    
    const raidRules = config.automodRules.Raids.filter(rule => rule.raidType === 'role');
    if (raidRules.length === 0) return;
    
    const rule = raidRules[0]; // Usar la primera regla de role raid
    const key = role.guild.id;
    
    if (!recentRoles.has(key)) {
      recentRoles.set(key, []);
    }
    
    const guildRoles = recentRoles.get(key);
    guildRoles.push({ timestamp: Date.now() });
    
    // Limpiar roles antiguos
    cleanupCache(recentRoles, rule.timeWindow, 'recentRoles');
    
    // Verificar si excede el límite
    if (guildRoles.length >= rule.roleCount) {
      // Log raid detection
      await LogManager.logRaidDetected(role.guild.id, 'role', {
        count: guildRoles.length,
        threshold: rule.roleCount,
        timeWindow: rule.timeWindow,
        lockdownDuration: rule.lockdownDuration
      });
      
      await applyLockdown(role.guild, rule.lockdownDuration, 'role');
      
      // Limpiar cache del servidor
      recentRoles.delete(key);
    }
    
  } catch (error) {
    console.error('Error en role raid detection:', error);
  }
});

/**
 * Guild Member Update Event - Boost Detection
 * 
 * Detects when a user boosts the server and logs the event
 */
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    // Check if user started boosting
    if (!oldMember.premiumSince && newMember.premiumSince) {
      console.log(`🚀 User ${newMember.user.tag} boosted ${newMember.guild.name}!`);
      
      // Log boost detection
      await LogManager.logBoostDetected(newMember.guild.id, newMember);
    }
  } catch (error) {
    console.error('❌ Error detecting boost:', error);
  }
});

/**
 * Database Connection
 * Connects to MongoDB to store and retrieve server configurations
 */
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/syro-bot')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

/**
 * Bot Authentication
 * Logs the bot into Discord using the token from environment variables
 */
client.login(process.env.DISCORD_TOKEN); 

// Rate limiting for administrative commands
const commandCooldowns = new Map();
const COMMAND_COOLDOWNS = {
  '!unlock': 30000,    // 30 seconds
  '!cleanraid': 60000, // 1 minute
  '!raidstatus': 10000, // 10 seconds
  'xnuke': 300000,     // 5 minutes
  'xconfirmnuke': 30000 // 30 seconds
};

/**
 * Check if user is on cooldown for a command
 * @param {string} userId - Discord user ID
 * @param {string} command - Command name
 * @returns {boolean} - True if user is on cooldown
 */
function isOnCooldown(userId, command) {
  const key = `${userId}-${command}`;
  const cooldown = COMMAND_COOLDOWNS[command];
  
  if (!cooldown) return false;
  
  const lastUsed = commandCooldowns.get(key);
  if (!lastUsed) return false;
  
  const timeLeft = cooldown - (Date.now() - lastUsed);
  return timeLeft > 0;
}

/**
 * Set cooldown for a command
 * @param {string} userId - Discord user ID
 * @param {string} command - Command name
 */
function setCooldown(userId, command) {
  const key = `${userId}-${command}`;
  commandCooldowns.set(key, Date.now());
  
  // Clean up old cooldowns
  setTimeout(() => {
    commandCooldowns.delete(key);
  }, COMMAND_COOLDOWNS[command] || 60000);
} 

// Debouncing for raid detection to prevent multiple triggers
const raidDetectionDebounce = new Map();
const RAID_DEBOUNCE_DELAY = 5000; // 5 seconds

/**
 * Debounced raid detection to prevent multiple triggers
 * @param {string} guildId - Discord guild ID
 * @param {string} raidType - Type of raid
 * @param {Function} callback - Function to execute after debounce
 */
function debouncedRaidDetection(guildId, raidType, callback) {
  const key = `${guildId}-${raidType}`;
  
  if (raidDetectionDebounce.has(key)) {
    clearTimeout(raidDetectionDebounce.get(key));
  }
  
  const timeoutId = setTimeout(() => {
    raidDetectionDebounce.delete(key);
    callback();
  }, RAID_DEBOUNCE_DELAY);
  
  raidDetectionDebounce.set(key, timeoutId);
} 

/**
 * Enhanced Error Handler with Context
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @param {Object} additionalData - Additional data for logging
 */
function handleError(error, context, additionalData = {}) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    ...additionalData
  };
  
  console.error(`❌ Error in ${context}:`, errorInfo);
  
  // Log to database if it's a critical error
  if (context.includes('lockdown') || context.includes('raid') || context.includes('spam')) {
    LogManager.logError(errorInfo).catch(err => {
      console.error('Failed to log error to database:', err);
    });
  }
}

/**
 * Safe async operation wrapper
 * @param {Function} operation - Async function to execute
 * @param {string} context - Context for error handling
 * @param {Function} fallback - Fallback function if operation fails
 */
async function safeAsyncOperation(operation, context, fallback = null) {
  try {
    return await operation();
  } catch (error) {
    handleError(error, context);
    if (fallback) {
      return fallback();
    }
    return null;
  }
} 

/**
 * Enhanced permission validation system
 */

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