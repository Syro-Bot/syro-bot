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
    cacheManager.serverLockdowns.set(guild.id, { startTime: Date.now(), duration, raidType });
    
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
          
          cacheManager.serverLockdowns.delete(guild.id);
          
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
          cacheManager.serverLockdowns.delete(guild.id);
        }
      }, duration * 60 * 1000);
      
      // Store timeout reference for potential cancellation
      cacheManager.serverLockdowns.set(guild.id, { 
        startTime: Date.now(), 
        duration, 
        raidType, 
        unlockTimeout 
      });
      
    } catch (error) {
      console.error('Error al aplicar lockdown:', error);
      cacheManager.serverLockdowns.delete(guild.id);
    }
  } catch (error) {
    console.error('Error en applyLockdown:', error);
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
    const botMember = guild.members.me;
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
    
    cacheManager.serverLockdowns.delete(guild.id);
    
    const embed = new EmbedBuilder()
      .setTitle('✅ SERVIDOR DESBLOQUEADO')
      .setDescription('El servidor ha sido desbloqueado manualmente por un administrador.')
      .setColor(0x00FF00)
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error al desbloquear manualmente:', error);
    await channel.send('❌ Error al desbloquear el servidor.');
  }
}

module.exports = {
  applyLockdown,
  manualUnlock
}; 