/**
 * @fileoverview Member Count Updater Utility
 *
 * Utilidad para actualizar automáticamente los canales de conteo de miembros
 * cuando los usuarios entran o salen del servidor.
 *
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 */

const MemberCountChannel = require('../models/MemberCountChannel');

/**
 * Actualiza todos los canales de conteo de miembros de un servidor
 * @param {string} guildId - ID del servidor
 * @param {object} client - Cliente de Discord
 */
async function updateMemberCountChannels(guildId, client) {
  try {
    console.log(`🔄 Starting member count update for guild ${guildId}`);
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.log(`❌ Guild ${guildId} not found for member count update`);
      return;
    }

    // Obtener todos los canales de conteo activos para este servidor
    const memberCountChannels = await MemberCountChannel.find({ 
      guildId, 
      isActive: true 
    });

    console.log(`📊 Found ${memberCountChannels.length} active member count channels for guild ${guildId}`);

    if (memberCountChannels.length === 0) {
      console.log(`ℹ️ No active member count channels found for guild ${guildId}`);
      return;
    }

    const memberCount = guild.memberCount;
    console.log(`👥 Guild ${guildId} has ${memberCount} members`);

    // Actualizar cada canal
    for (const channelConfig of memberCountChannels) {
      try {
        console.log(`🔄 Processing channel ${channelConfig.channelId} (${channelConfig.displayName})`);
        
        const channel = guild.channels.cache.get(channelConfig.channelId);
        if (!channel) {
          console.log(`❌ Channel ${channelConfig.channelId} not found, marking as inactive`);
          await MemberCountChannel.findOneAndUpdate(
            { _id: channelConfig._id },
            { isActive: false }
          );
          continue;
        }

        const newChannelName = `${channelConfig.displayName}: ${memberCount}`;
        
        console.log(`📝 Current channel name: "${channel.name}"`);
        console.log(`📝 New channel name: "${newChannelName}"`);
        
        // Solo actualizar si el nombre es diferente
        if (channel.name !== newChannelName) {
          console.log(`✅ Updating channel name from "${channel.name}" to "${newChannelName}"`);
          await channel.setName(newChannelName);
          console.log(`✅ Successfully updated channel ${channelConfig.channelId}`);
        } else {
          console.log(`ℹ️ Channel name is already up to date: "${channel.name}"`);
        }

      } catch (error) {
        console.error(`❌ Error updating member count channel ${channelConfig.channelId}:`, error);
        
        // Si el error es de permisos, marcar como inactivo
        if (error.code === 50013) { // Missing Permissions
          console.log(`🚫 Missing permissions for channel ${channelConfig.channelId}, marking as inactive`);
          await MemberCountChannel.findOneAndUpdate(
            { _id: channelConfig._id },
            { isActive: false }
          );
        }
      }
    }

    console.log(`✅ Member count update completed for guild ${guildId}`);

  } catch (error) {
    console.error('❌ Error in updateMemberCountChannels:', error);
  }
}

/**
 * Configura los event listeners para actualizar automáticamente los canales
 * @param {object} client - Cliente de Discord
 */
function setupMemberCountListeners(client) {
  console.log('🔧 Setting up member count listeners...');
  
  // Evento cuando un miembro se une al servidor
  client.on('guildMemberAdd', async (member) => {
    console.log(`👋 Member joined: ${member.user.tag} in ${member.guild.name} (${member.guild.id})`);
    console.log(`📊 New member count: ${member.guild.memberCount}`);
    
    // Pequeña pausa para asegurar que Discord haya actualizado el conteo
    setTimeout(async () => {
      await updateMemberCountChannels(member.guild.id, client);
    }, 1000);
  });

  // Evento cuando un miembro sale del servidor
  client.on('guildMemberRemove', async (member) => {
    console.log(`👋 Member left: ${member.user.tag} from ${member.guild.name} (${member.guild.id})`);
    console.log(`📊 New member count: ${member.guild.memberCount}`);
    
    // Pequeña pausa para asegurar que Discord haya actualizado el conteo
    setTimeout(async () => {
      await updateMemberCountChannels(member.guild.id, client);
    }, 1000);
  });

  // Evento cuando el bot se une a un servidor
  client.on('guildCreate', async (guild) => {
    console.log(`🤖 Bot joined guild: ${guild.name} (${guild.id})`);
    await updateMemberCountChannels(guild.id, client);
  });

  // Evento cuando el bot sale de un servidor
  client.on('guildDelete', async (guild) => {
    console.log(`🤖 Bot left guild: ${guild.name} (${guild.id})`);
    // Marcar todos los canales de conteo como inactivos
    await MemberCountChannel.updateMany(
      { guildId: guild.id },
      { isActive: false }
    );
  });

  console.log('✅ Member count listeners configured successfully');
}

/**
 * Actualiza todos los canales de conteo de todos los servidores
 * Útil para sincronización inicial o corrección de datos
 * @param {object} client - Cliente de Discord
 */
async function updateAllMemberCountChannels(client) {
  try {
    console.log('🔄 Starting global member count channel update...');
    
    const guilds = client.guilds.cache;
    let updatedGuilds = 0;
    let totalChannels = 0;

    for (const [guildId, guild] of guilds) {
      try {
        const channels = await MemberCountChannel.find({ guildId, isActive: true });
        if (channels.length > 0) {
          await updateMemberCountChannels(guildId, client);
          updatedGuilds++;
          totalChannels += channels.length;
        }
      } catch (error) {
        console.error(`Error updating guild ${guildId}:`, error);
      }
    }

    console.log(`✅ Global update completed: ${updatedGuilds} guilds, ${totalChannels} channels updated`);

  } catch (error) {
    console.error('Error in updateAllMemberCountChannels:', error);
  }
}

module.exports = {
  updateMemberCountChannels,
  setupMemberCountListeners,
  updateAllMemberCountChannels
}; 