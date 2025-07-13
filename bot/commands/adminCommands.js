/**
 * Administrative Commands
 * Handles all administrative commands with rate limiting and permission checks
 */

const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const cacheManager = require('../services/cacheManager');
const lockdownService = require('../services/lockdownService');
const { getCustomEmoji } = require('../utils/permissionValidator');
const { handleError } = require('../utils/errorHandler');

/**
 * Handle unlock command
 * @param {Message} message - Discord message object
 */
async function handleUnlockCommand(message) {
  // Check rate limiting
  if (cacheManager.isOnCooldown(message.author.id, 'xunlock')) {
    await message.channel.send('⏰ Debes esperar antes de usar este comando nuevamente.');
    return;
  }
  
  cacheManager.setCooldown(message.author.id, 'xunlock');
  
  try {
    await lockdownService.manualUnlock(message.guild, message.channel);
  } catch (error) {
    handleError(error, 'unlock command');
  }
}

/**
 * Handle cleanraid command
 * @param {Message} message - Discord message object
 */
async function handleCleanRaidCommand(message) {
  // Check rate limiting
  if (cacheManager.isOnCooldown(message.author.id, 'xcleanraid')) {
    await message.channel.send('⏰ Debes esperar antes de usar este comando nuevamente.');
    return;
  }
  
  cacheManager.setCooldown(message.author.id, 'xcleanraid');
  
  try {
    const guild = message.guild;
    console.log(`🧹 Comando cleanraid ejecutado por ${message.author.tag} en ${guild.name}`);
    
    if (cacheManager.raidChannels.has(guild.id)) {
      const channelsToDelete = cacheManager.raidChannels.get(guild.id);
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
      
      cacheManager.raidChannels.delete(guild.id);
      
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
    handleError(error, 'cleanraid command');
    await message.channel.send('❌ Error al limpiar canales de raid.');
  }
}

/**
 * Handle raidstatus command
 * @param {Message} message - Discord message object
 */
async function handleRaidStatusCommand(message) {
  // Check rate limiting
  if (cacheManager.isOnCooldown(message.author.id, 'xraidstatus')) {
    await message.channel.send('⏰ Debes esperar antes de usar este comando nuevamente.');
    return;
  }
  
  cacheManager.setCooldown(message.author.id, 'xraidstatus');
  
  try {
    const guild = message.guild;
    console.log(`📊 Comando raidstatus ejecutado por ${message.author.tag} en ${guild.name}`);
    
    const hasRaidChannels = cacheManager.raidChannels.has(guild.id);
    const raidChannelsList = hasRaidChannels ? cacheManager.raidChannels.get(guild.id) : [];
    const isLocked = cacheManager.serverLockdowns.has(guild.id);
    
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
    handleError(error, 'raidstatus command');
    await message.channel.send('❌ Error al mostrar estado de raid.');
  }
}

/**
 * Handle nuke command
 * @param {Message} message - Discord message object
 */
async function handleNukeCommand(message) {
  // Check rate limiting
  if (cacheManager.isOnCooldown(message.author.id, 'xnuke')) {
    await message.channel.send('⏰ Debes esperar antes de usar este comando nuevamente.');
    return;
  }
  
  cacheManager.setCooldown(message.author.id, 'xnuke');
  
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
    
    // Create filter for confirmation
    const filter = m => m.author.id === user.id && m.content === 'xconfirmnuke';
    const collector = message.channel.createMessageCollector({ filter, time: 30000, max: 1 });
    
    collector.on('collect', async (confirmMessage) => {
      try {
        // Save channel info before deleting
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
        
        // Delete the channel
        await channel.delete('Nuke command executed by ' + user.tag);
        
        // Create new channel with same configuration
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
        
        // Restore permissions
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
            { name: '👤 Executed by', value: user.tag, inline: true },
            { name: '📊 Messages deleted', value: 'All messages permanently deleted', inline: true }
          )
          .setColor(0xFF0000)
          .setTimestamp();
        
        await newChannel.send({ embeds: [successEmbed] });
        
      } catch (error) {
        console.error('Error during nuke execution:', error);
        await message.channel.send('❌ Error during nuke execution.');
      }
    });
    
    collector.on('end', (collected) => {
      if (collected.size === 0) {
        message.channel.send('⏰ Nuke cancelled - no confirmation received within 30 seconds.');
      }
    });
    
  } catch (error) {
    handleError(error, 'nuke command');
    await message.channel.send('❌ Error with nuke command.');
  }
}

/**
 * Handle avatar command
 * @param {Message} message - Discord message object
 */
async function handleAvatarCommand(message) {
  try {
    const args = message.content.split(' ');
    let targetUser = message.author; // Default to message author
    
    // Check if a user was mentioned
    if (args.length > 1 && message.mentions.users.size > 0) {
      targetUser = message.mentions.users.first();
    }
    
    const avatarURL = targetUser.displayAvatarURL({ size: 1024, dynamic: true });
    
    // Send simple message with avatar image
    await message.channel.send({
      content: `Avatar de ${targetUser}`,
      files: [avatarURL]
    });
    
  } catch (error) {
    handleError(error, 'avatar command');
    await message.channel.send('❌ Error al mostrar el avatar.');
  }
}

/**
 * Handle purge command
 * @param {Message} message - Discord message object
 */
async function handlePurgeCommand(message) {
  try {
    const args = message.content.split(' ');
    let amount = 10; // Default 10 messages
    
    // Check if a specific amount was provided
    if (args.length > 1) {
      const specifiedAmount = parseInt(args[1]);
      if (!isNaN(specifiedAmount) && specifiedAmount > 0) {
        amount = Math.min(specifiedAmount, 50); // Maximum 50 messages
      }
    }
    
    console.log(`🧹 Purge command executed by ${message.author.tag} in ${message.guild.name} - Amount: ${amount}`);
    
    // Verify bot permissions
    if (!message.channel.permissionsFor(message.guild.members.me).has(PermissionsBitField.Flags.ManageMessages)) {
      await message.channel.send('❌ No tengo permisos para eliminar mensajes en este canal.');
      return;
    }
    
    // Get messages and filter deletable ones (excluding the command message)
    const messagesToDelete = await message.channel.messages.fetch({ limit: amount + 1 }); // +1 to include the command
    const deletableMessages = messagesToDelete.filter(msg => 
      msg.id !== message.id && // Don't delete the command message
      msg.createdTimestamp > Date.now() - 14 * 24 * 60 * 60 * 1000 && // Only messages from last 14 days
      !msg.pinned // Don't delete pinned messages
    );
    
    if (deletableMessages.size === 0) {
      await message.channel.send('❌ No hay mensajes que se puedan eliminar.');
      return;
    }
    
    // Delete messages
    await message.channel.bulkDelete(deletableMessages);
    
    // Add reaction to the command message
    try {
      // Try to find the custom emoji in the guild
      const customEmoji = message.guild.emojis.cache.find(emoji => emoji.name === 'check_yes2');
      if (customEmoji) {
        await message.react(customEmoji);
        console.log(`✅ Reacción agregada con emoji personalizado: ${customEmoji.name}`);
      } else {
        // Fallback to default check emoji
        await message.react('✅');
        console.log('⚠️ Emoji personalizado check_yes2 no encontrado, usando emoji estándar');
      }
    } catch (reactionError) {
      console.log('❌ Error agregando reacción:', reactionError.message);
      // Final fallback to default check emoji
      try {
        await message.react('✅');
      } catch (fallbackError) {
        console.log('❌ No se pudo agregar ninguna reacción:', fallbackError.message);
      }
    }
    
  } catch (error) {
    handleError(error, 'purge command');
    await message.channel.send('❌ Error al eliminar mensajes. Asegúrate de que los mensajes no sean más antiguos de 14 días.');
  }
}

module.exports = {
  handleUnlockCommand,
  handleCleanRaidCommand,
  handleRaidStatusCommand,
  handleNukeCommand,
  handleAvatarCommand,
  handlePurgeCommand
}; 