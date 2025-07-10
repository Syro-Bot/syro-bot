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
 * In-Memory Cache System
 * Stores temporary data for automoderation and raid detection
 * All caches are cleared automatically based on time windows
 */
const recentMessages = new Map();    // Tracks recent messages per user for spam detection
const recentJoins = new Map();       // Tracks recent member joins for raid detection
const recentChannels = new Map();    // Tracks recent channel creation for raid detection
const recentRoles = new Map();       // Tracks recent role creation for raid detection
const serverLockdowns = new Map();   // Tracks servers currently in lockdown
const raidChannels = new Map();      // Tracks channels created during raids for cleanup

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
 * Cache Cleanup Utility
 * 
 * Removes old entries from cache maps based on time windows.
 * This prevents memory leaks and ensures accurate automoderation.
 * 
 * @param {Map} cache - The cache map to clean (recentMessages, recentJoins, etc.)
 * @param {number} timeWindow - Time window in seconds for keeping entries
 */
function cleanupCache(cache, timeWindow) {
  const now = Date.now();
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
    // Create canvas with dimensions from config
    const canvas = createCanvas(600, 300);
    const ctx = canvas.getContext('2d');
    
    // Set background color
    ctx.fillStyle = config.backgroundColor || '#1a1a1a';
    ctx.fillRect(0, 0, 600, 300);
    
    // Load and draw background image if provided
    if (config.backgroundImage) {
      try {
        const bgImage = await loadImage(config.backgroundImage);
        ctx.drawImage(bgImage, 0, 0, 600, 300);
      } catch (error) {
        console.log('Error loading background image, using color only:', error.message);
      }
    }
    
    // Load user avatar
    let avatarImage;
    try {
      console.log('Loading avatar from URL:', userAvatarUrl);
      avatarImage = await loadImage(userAvatarUrl);
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
          ctx.fillStyle = '#7289da';
          ctx.beginPath();
          ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
          ctx.fill();
          return canvas.toBuffer('image/png');
        }
      }
    }
    
    // Draw user avatar in center
    const avatarSize = config.imageSize || 120;
    const avatarX = (600 - avatarSize) / 2;
    const avatarY = (300 - avatarSize) / 2;
    
    // Create circular avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
    
    // Configure text styling
    const fontSize = config.fontSize || 24;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = config.textColor || '#ffffff';
    ctx.textAlign = 'center';
    
    // Draw welcome text at top (16px from top, matching frontend top-4)
    const welcomeText = config.welcomeText || 'Welcome';
    ctx.fillText(welcomeText, 300, 16 + fontSize);
    
    // Draw user text at bottom (32px from bottom, slightly higher than frontend)
    const userText = (config.userText || '{user}').replace('{user}', username);
    ctx.font = `bold ${fontSize * 0.8}px Arial`;
    ctx.fillText(userText, 300, 300 - 32);
    
    // Return the image buffer
    return canvas.toBuffer('image/png');
  } catch (error) {
    console.error('Error generating welcome image:', error);
    throw error;
  }
}

/**
 * Server Lockdown Management
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
  console.log(`🔒 applyLockdown iniciado para ${guild.name} - raidType: ${raidType}, duration: ${duration}`);
  
  if (serverLockdowns.has(guild.id)) {
    console.log(`⚠️ Servidor ${guild.name} ya está en lockdown`);
    return; // Ya está en lockdown
  }
  
  console.log(`🔒 Aplicando lockdown a ${guild.name}`);
  serverLockdowns.set(guild.id, true);
  
  try {
    console.log(`🔧 Verificando permisos del bot en ${guild.name}`);
    console.log(`🔧 Permisos del bot:`, guild.members.me.permissions.toArray());
    
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
      ch.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.ManageChannels)
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
                        guild.channels.cache.find(ch => ch.type === 0 && ch.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.SendMessages));
    
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
    setTimeout(async () => {
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
    
  } catch (error) {
    console.error('Error al aplicar lockdown:', error);
    serverLockdowns.delete(guild.id);
  }
}

/**
 * Bot Ready Event
 * Fired when the bot successfully connects to Discord
 */
client.once('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
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
    const config = await ServerConfig.findOne({ serverId: message.guild.id });
    if (config && config.automodRules?.Spam && config.automodRules.Spam.length > 0) {
      const rule = config.automodRules.Spam[0];
      const key = `${message.guild.id}-${message.author.id}`;
      
      if (!recentMessages.has(key)) {
        recentMessages.set(key, []);
      }
      
      const userMessages = recentMessages.get(key);
      userMessages.push({ timestamp: Date.now() });
      
      // Limpiar mensajes antiguos
      cleanupCache(recentMessages, rule.timeWindow);
      
      // Verificar si excede el límite
      if (userMessages.length >= rule.messageCount) {
        // Eliminar mensajes del usuario
        const messagesToDelete = await message.channel.messages.fetch({ limit: 50 });
        const userRecentMessages = messagesToDelete.filter(msg => 
          msg.author.id === message.author.id && 
          Date.now() - msg.createdTimestamp < rule.timeWindow * 1000
        );
        
        if (userRecentMessages.size > 0) {
          await message.channel.bulkDelete(userRecentMessages);
        }
        
        // Enviar advertencia
        const embed = new EmbedBuilder()
          .setTitle('⚠️ SPAM DETECTADO')
          .setDescription(`${message.author}, has enviado demasiados mensajes rápidamente. Tus mensajes han sido eliminados.`)
          .setColor(0xFFA500)
          .setTimestamp();
        
        await message.channel.send({ embeds: [embed] });
        
        // Limpiar cache del usuario
        recentMessages.delete(key);
      }
    }
    
    // ===== ADMINISTRATIVE COMMANDS =====
    // Solo procesar comandos si el usuario es administrador
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return;
    }
    
    // Comando !unlock
    if (message.content === '!unlock') {
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
          } else {
            // If mentionUser is disabled, send only the image
            await channel.send({ files: [attachment] });
            console.log(`✅ Welcome image sent for ${member.user.tag} (no text message)`);
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
    cleanupCache(recentJoins, rule.timeWindow);
    
    // Check if limit is exceeded
    if (guildJoins.length >= rule.joinCount) {
      console.log(`🚨 JOIN RAID DETECTED! Applying lockdown for ${rule.lockdownDuration} minutes`);
      await applyLockdown(member.guild, rule.lockdownDuration, 'join');
      
      // Clear server cache
      recentJoins.delete(key);
    }
    
  } catch (error) {
    console.error('❌ Error in join raid detection:', error);
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
    cleanupCache(recentChannels, rule.timeWindow);
    
    // Verificar si excede el límite
    if (guildChannels.length >= rule.channelCount) {
      console.log(`🚨 RAID DE CANALES DETECTADO! Aplicando lockdown por ${rule.lockdownDuration} minutos`);
      console.log(`🔧 Llamando applyLockdown con raidType: 'channel'`);
      console.log(`🔧 Parámetros: guild=${channel.guild.name}, duration=${rule.lockdownDuration}, raidType=channel`);
      
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
    cleanupCache(recentRoles, rule.timeWindow);
    
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