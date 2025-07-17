/**
 * @fileoverview Nuke Routes
 *
 * Rutas para manejar la funcionalidad de nuke (eliminar y recrear canales).
 * Permite eliminar completamente un canal y crear uno nuevo con el mismo nombre.
 *
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 */

const express = require('express');
const router = express.Router();
const LogManager = require('../utils/logManager');
const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for nuke endpoints
 * Prevents abuse and excessive destructive actions.
 */
const nukeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 nuke requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many nuke requests, please try again later.'
  }
});

// Apply rate limiting to all nuke endpoints
router.use('/', nukeLimiter);

/**
 * POST /api/nuke/:guildId
 * Elimina y recrea un canal (nuke)
 */
router.post('/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { channelId } = req.body;

    if (!channelId) {
      return res.status(400).json({
        success: false,
        error: 'Channel ID required'
      });
    }

    const guild = req.app.locals.client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    // Verificar que sea un canal de texto
    if (channel.type !== 0) {
      return res.status(400).json({
        success: false,
        error: 'Only text channels can be nuked'
      });
    }

    // Verificar permisos del bot
    if (!channel.permissionsFor(req.app.locals.client.user).has(['ManageChannels', 'ViewChannel'])) {
      return res.status(403).json({
        success: false,
        error: 'I don\'t have permissions to manage this channel'
      });
    }

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
    await channel.delete('Nuke command executed');

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
      const embed = {
        color: 0x00ff00,
        title: '💥 Channel Nuked',
        description: 'This channel has been completely deleted and recreated.',
        fields: [
          {
            name: '🕐 Timestamp',
            value: new Date().toLocaleString('en-US', {
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
            name: '👤 Executed by',
            value: 'Dashboard Web',
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      };

    await newChannel.send({ embeds: [embed] });

    // Log the nuke action
    await LogManager.logChannelNuke(guildId, channelInfo.name, newChannel.id, 'Dashboard Web');

          res.json({
        success: true,
        message: 'Channel nuked successfully',
        newChannelId: newChannel.id
      });

  } catch (error) {
    console.error('Error nuking channel:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router; 