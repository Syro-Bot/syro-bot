/**
 * Lockdown Service
 * Handles server lockdown operations with security validations
 */

const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const cacheManager = require('./cacheManager');
const LogManager = require('../utils/logManager');
const { handleError } = require('../utils/errorHandler');
const { LOCKDOWN_LIMITS, VALID_RAID_TYPES } = require('../config/constants');

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
    if (!duration || duration < LOCKDOWN_LIMITS.MIN_DURATION || duration > LOCKDOWN_LIMITS.MAX_DURATION) {
      console.error(`❌ Invalid lockdown duration: ${duration}. Must be between ${LOCKDOWN_LIMITS.MIN_DURATION} and ${LOCKDOWN_LIMITS.MAX_DURATION} minutes.`);
      return;
    }
    
    // Validate raid type
    if (!VALID_RAID_TYPES.includes(raidType)) {
      console.error(`❌ Invalid raid type: ${raidType}. Must be one of: ${VALID_RAID_TYPES.join(', ')}`);
      return;
    }
    
    // Check if already in lockdown
    if (cacheManager.serverLockdowns.has(guild.id)) {
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
    
    // Store lockdown info with start time
    const lockdownInfo = { 
      startTime: Date.now(), 
      duration, 
      raidType,
      originalPermissions: null // We'll store the original permissions here
    };
    
    cacheManager.serverLockdowns.set(guild.id, lockdownInfo);
    
    // Log lockdown started
    await LogManager.logLockdownStarted(guild.id, `Raid detection: ${raidType}`, duration);
    
    try {
      console.log(`🔧 Verificando permisos del bot en ${guild.name}`);
      console.log(`🔧 Permisos del bot:`, botMember.permissions.toArray());
      
      // Obtener el rol @everyone
      const everyoneRole = guild.roles.everyone;
      
      // Store original permissions before modifying
      lockdownInfo.originalPermissions = everyoneRole.permissions.toArray();
      console.log(`📋 Permisos originales de @everyone:`, lockdownInfo.originalPermissions);
      
      // Apply minimal restrictions - only block message sending and file attachments
      // Don't block invites, voice channels, or other essential permissions
      await everyoneRole.setPermissions([
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.UseExternalEmojis,
        PermissionsBitField.Flags.AddReactions,
        PermissionsBitField.Flags.Connect, // Allow voice connections
        PermissionsBitField.Flags.Speak,   // Allow speaking in voice
        PermissionsBitField.Flags.CreateInvite, // Allow creating invites
        PermissionsBitField.Flags.UseVAD,  // Allow voice activity detection
        PermissionsBitField.Flags.Stream,  // Allow streaming
        PermissionsBitField.Flags.UseEmbeddedActivities, // Allow activities
        PermissionsBitField.Flags.UseSoundboard, // Allow soundboard
        PermissionsBitField.Flags.UseExternalStickers, // Allow external stickers
        PermissionsBitField.Flags.SendMessagesInThreads, // Allow thread messages
        PermissionsBitField.Flags.CreatePublicThreads, // Allow public threads
        PermissionsBitField.Flags.CreatePrivateThreads, // Allow private threads
        PermissionsBitField.Flags.AttachFiles, // Allow file attachments
        PermissionsBitField.Flags.EmbedLinks, // Allow embeds
        // Only block these specific permissions:
        // SendMessages: false (blocked)
        // CreateInstantInvite: false (blocked for channels, but allowed for roles)
      ]);
      
      console.log(`✅ Permisos de @everyone actualizados - solo mensajes bloqueados`);
      
      // Apply channel-specific restrictions only to text channels
      const textChannelsToRestrict = guild.channels.cache.filter(ch => 
        ch.type === 0 && // Solo canales de texto
        ch.permissionsFor(botMember).has(PermissionsBitField.Flags.ManageChannels)
      );
      
      console.log(`📝 Aplicando restricciones a ${textChannelsToRestrict.size} canales de texto`);
      
      for (const [_, channel] of textChannelsToRestrict) {
        try {
          await channel.permissionOverwrites.edit(everyoneRole, {
            SendMessages: false,
            AttachFiles: false,
            EmbedLinks: false
          });
          console.log(`✅ Restricciones aplicadas a #${channel.name}`);
        } catch (error) {
          console.error(`❌ Error restringiendo canal ${channel.name}:`, error);
        }
      }
      
      // Eliminar canales creados durante el raid si es un channel raid
      if (raidType === 'channel' && cacheManager.raidChannels.has(guild.id)) {
        const channelsToDelete = cacheManager.raidChannels.get(guild.id);
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
        cacheManager.raidChannels.delete(guild.id);
      } else {
        console.log(`ℹ️ No se eliminaron canales - raidType: ${raidType}, tiene raidChannels: ${cacheManager.raidChannels.has(guild.id)}`);
      }
      
      // Enviar alerta
      const alertChannel = guild.systemChannel || 
                          guild.channels.cache.find(ch => ch.type === 0 && ch.permissionsFor(botMember).has(PermissionsBitField.Flags.SendMessages));
      
      if (alertChannel) {
        const embed = new EmbedBuilder()
          .setTitle('🚨 RAID DETECTADO')
          .setDescription(`Se ha detectado actividad sospechosa (${raidType}). El servidor ha sido puesto en lockdown por ${duration} minutos.\n\n**Restricciones aplicadas:**\n• Mensajes de texto bloqueados\n• Archivos adjuntos bloqueados\n• Embeds bloqueados\n\n**Permisos mantenidos:**\n• Canales de voz funcionando\n• Invitaciones permitidas\n• Reacciones permitidas`)
          .setColor(0xFF0000)
          .setTimestamp();
        
        await alertChannel.send({ embeds: [embed] });
      }
      
      // Auto-unlock después del tiempo especificado
      const unlockTimeout = setTimeout(async () => {
        try {
          console.log(`⏰ Auto-unlock iniciado para ${guild.name} después de ${duration} minutos`);
          
          // Restore original permissions
          if (lockdownInfo.originalPermissions) {
            await everyoneRole.setPermissions(lockdownInfo.originalPermissions);
            console.log(`✅ Permisos originales restaurados para @everyone`);
          } else {
            // Fallback to default permissions if original not stored
            await everyoneRole.setPermissions([
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.AttachFiles,
              PermissionsBitField.Flags.EmbedLinks,
              PermissionsBitField.Flags.UseExternalEmojis,
              PermissionsBitField.Flags.AddReactions,
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.Speak,
              PermissionsBitField.Flags.CreateInvite,
              PermissionsBitField.Flags.UseVAD,
              PermissionsBitField.Flags.Stream,
              PermissionsBitField.Flags.UseEmbeddedActivities,
              PermissionsBitField.Flags.UseSoundboard,
              PermissionsBitField.Flags.UseExternalStickers,
              PermissionsBitField.Flags.SendMessagesInThreads,
              PermissionsBitField.Flags.CreatePublicThreads,
              PermissionsBitField.Flags.CreatePrivateThreads
            ]);
            console.log(`✅ Permisos por defecto restaurados para @everyone`);
          }
          
          // Restaurar permisos en canales específicos
          const channelsToRestore = guild.channels.cache.filter(ch => 
            ch.type === 0 && // Solo canales de texto
            ch.permissionsFor(botMember).has(PermissionsBitField.Flags.ManageChannels)
          );
          
          console.log(`📝 Restaurando permisos en ${channelsToRestore.size} canales de texto`);
          
          for (const [_, channel] of channelsToRestore) {
            try {
              await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: null,
                AttachFiles: null,
                EmbedLinks: null
              });
              console.log(`✅ Permisos restaurados en #${channel.name}`);
            } catch (error) {
              console.error(`❌ Error restaurando canal ${channel.name}:`, error);
            }
          }
          
          cacheManager.serverLockdowns.delete(guild.id);
          console.log(`✅ Lockdown removido de cache para ${guild.name}`);
          
          // Log lockdown ended
          await LogManager.logLockdownEnded(guild.id);
          
          if (alertChannel) {
            const embed = new EmbedBuilder()
              .setTitle('✅ LOCKDOWN TERMINADO')
              .setDescription('El servidor ha sido desbloqueado automáticamente.\n\n**Permisos restaurados:**\n• Mensajes de texto habilitados\n• Archivos adjuntos habilitados\n• Embeds habilitados\n• Todos los permisos originales restaurados')
              .setColor(0x00FF00)
              .setTimestamp();
            
            await alertChannel.send({ embeds: [embed] });
          }
        } catch (error) {
          console.error('❌ Error al desbloquear servidor automáticamente:', error);
          cacheManager.serverLockdowns.delete(guild.id);
        }
      }, duration * 60 * 1000);
      
      // Store timeout reference for potential cancellation
      lockdownInfo.unlockTimeout = unlockTimeout;
      
    } catch (error) {
      console.error('❌ Error al aplicar lockdown:', error);
      cacheManager.serverLockdowns.delete(guild.id);
    }
  } catch (error) {
    console.error('❌ Error en applyLockdown:', error);
    cacheManager.serverLockdowns.delete(guild.id);
  }
}

/**
 * Manual unlock function for administrators
 * @param {Guild} guild - Discord guild
 * @param {TextChannel} channel - Channel to send confirmation
 */
async function manualUnlock(guild, channel) {
  try {
    console.log(`🔓 Manual unlock iniciado para ${guild.name} por ${channel.name}`);
    
    const everyoneRole = guild.roles.everyone;
    const lockdownInfo = cacheManager.serverLockdowns.get(guild.id);
    
    if (!lockdownInfo) {
      await channel.send('✅ El servidor no está en lockdown.');
      return;
    }
    
    // Restore original permissions if available
    if (lockdownInfo.originalPermissions) {
      await everyoneRole.setPermissions(lockdownInfo.originalPermissions);
      console.log(`✅ Permisos originales restaurados manualmente para @everyone`);
    } else {
      // Fallback to default permissions
      await everyoneRole.setPermissions([
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.EmbedLinks,
        PermissionsBitField.Flags.UseExternalEmojis,
        PermissionsBitField.Flags.AddReactions,
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.Speak,
        PermissionsBitField.Flags.CreateInvite,
        PermissionsBitField.Flags.UseVAD,
        PermissionsBitField.Flags.Stream,
        PermissionsBitField.Flags.UseEmbeddedActivities,
        PermissionsBitField.Flags.UseSoundboard,
        PermissionsBitField.Flags.UseExternalStickers,
        PermissionsBitField.Flags.SendMessagesInThreads,
        PermissionsBitField.Flags.CreatePublicThreads,
        PermissionsBitField.Flags.CreatePrivateThreads
      ]);
      console.log(`✅ Permisos por defecto restaurados manualmente para @everyone`);
    }
    
    // Restaurar permisos en canales específicos
    const botMember = guild.members.me;
    const channelsToRestore = guild.channels.cache.filter(ch => 
      ch.type === 0 && // Solo canales de texto
      ch.permissionsFor(botMember).has(PermissionsBitField.Flags.ManageChannels)
    );
    
    console.log(`📝 Restaurando permisos manualmente en ${channelsToRestore.size} canales de texto`);
    
    for (const [_, textChannel] of channelsToRestore) {
      try {
        await textChannel.permissionOverwrites.edit(everyoneRole, {
          SendMessages: null,
          AttachFiles: null,
          EmbedLinks: null
        });
        console.log(`✅ Permisos restaurados manualmente en #${textChannel.name}`);
      } catch (error) {
        console.error(`❌ Error restaurando canal ${textChannel.name}:`, error);
      }
    }
    
    // Clear timeout if it exists
    if (lockdownInfo.unlockTimeout) {
      clearTimeout(lockdownInfo.unlockTimeout);
      console.log(`⏰ Timeout de auto-unlock cancelado`);
    }
    
    cacheManager.serverLockdowns.delete(guild.id);
    console.log(`✅ Lockdown removido manualmente de cache para ${guild.name}`);
    
    const embed = new EmbedBuilder()
      .setTitle('✅ SERVIDOR DESBLOQUEADO')
      .setDescription('El servidor ha sido desbloqueado manualmente por un administrador.\n\n**Permisos restaurados:**\n• Mensajes de texto habilitados\n• Archivos adjuntos habilitados\n• Embeds habilitados\n• Canales de voz funcionando\n• Invitaciones habilitadas\n• Todos los permisos originales restaurados')
      .setColor(0x00FF00)
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
    
  } catch (error) {
    console.error('❌ Error al desbloquear manualmente:', error);
    await channel.send('❌ Error al desbloquear el servidor.');
  }
}

module.exports = {
  applyLockdown,
  manualUnlock
}; 