/**
 * @fileoverview Nuke Command
 *
 * Comando de Discord para nukear canales.
 * Permite eliminar y recrear canales directamente desde el chat.
 *
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const LogManager = require('../utils/logManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Elimina y recrea el canal actual (nuke)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption(option =>
      option.setName('confirmacion')
        .setDescription('Escribe "CONFIRMAR" para confirmar la acción')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const { channel, guild, user } = interaction;
      const confirmacion = interaction.options.getString('confirmacion');

      // Verificar que sea un canal de texto
      if (channel.type !== 0) {
        return interaction.reply({
          content: '❌ Solo se pueden nukear canales de texto.',
          ephemeral: true
        });
      }

      // Verificar permisos del bot
      if (!channel.permissionsFor(interaction.client.user).has(['ManageChannels', 'ViewChannel'])) {
        return interaction.reply({
          content: '❌ No tengo permisos para gestionar este canal.',
          ephemeral: true
        });
      }

      // Verificar confirmación
      if (confirmacion !== 'CONFIRMAR') {
        return interaction.reply({
          content: '❌ Para confirmar el nuke, debes escribir "CONFIRMAR" en el campo de confirmación.',
          ephemeral: true
        });
      }

      // Responder inmediatamente
      await interaction.reply({
        content: '💥 Iniciando nuke del canal...',
        ephemeral: true
      });

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

      // Enviar mensaje de confirmación al nuevo canal
      const embed = {
        color: 0x00ff00,
        title: '💥 Canal Nukeado',
        description: 'Este canal ha sido eliminado y recreado completamente.',
        fields: [
          {
            name: '🕐 Timestamp',
            value: new Date().toLocaleString('es-ES', {
              timeZone: 'America/New_York',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            inline: true
          },
          {
            name: '👤 Ejecutado por',
            value: user.tag,
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      };

      await newChannel.send({ embeds: [embed] });

      // Log the nuke action
      await LogManager.logChannelNuke(guild.id, channelInfo.name, newChannel.id, user.tag);

      // Actualizar la respuesta original
      await interaction.editReply({
        content: `✅ Canal nukeado exitosamente! Nuevo canal: <#${newChannel.id}>`,
        ephemeral: true
      });

    } catch (error) {
      console.error('Error executing nuke command:', error);
      
      // Intentar responder con el error
      try {
        if (interaction.replied) {
          await interaction.editReply({
            content: '❌ Error al nukear el canal. Verifica los permisos y intenta de nuevo.',
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: '❌ Error al nukear el canal. Verifica los permisos y intenta de nuevo.',
            ephemeral: true
          });
        }
      } catch (replyError) {
        console.error('Error sending error reply:', replyError);
      }
    }
  },
}; 