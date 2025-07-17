/**
 * @fileoverview Member Count Channel Routes
 *
 * Rutas para manejar la creación y gestión de canales de conteo de miembros.
 * Permite crear canales de voz que muestran el número total de miembros en tiempo real.
 *
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 */

const express = require('express');
const router = express.Router();
const MemberCountChannel = require('../models/MemberCountChannel');
const { PermissionsBitField } = require('discord.js');
const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for member count endpoints
 * Prevents abuse and excessive requests.
 */
const memberCountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many member count requests, please try again later.'
  }
});

// Apply rate limiting to all member count endpoints
router.use('/', memberCountLimiter);

/**
 * GET /api/member-count/:guildId/info
 * Obtiene información del servidor incluyendo el número de miembros
 */
router.get('/:guildId/info', async (req, res) => {
  try {
    const { guildId } = req.params;

    const guild = req.app.locals.client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    // Obtener el conteo actual de miembros
    const memberCount = guild.memberCount;
    
    // Obtener canales de conteo activos
    const channels = await MemberCountChannel.find({ guildId, isActive: true });
    
    res.json({
      success: true,
      guild: {
        id: guild.id,
        name: guild.name,
        memberCount,
        memberCountChannels: channels.length
      }
    });

  } catch (error) {
    console.error('Error fetching guild info:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/member-count/:guildId
 * Obtiene todos los canales de conteo de miembros de un servidor
 */
router.get('/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;

    const channels = await MemberCountChannel.find({ guildId, isActive: true });
    
    res.json({
      success: true,
      channels
    });

  } catch (error) {
    console.error('Error fetching member count channels:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/member-count/:guildId
 * Crea un nuevo canal de conteo de miembros
 */
router.post('/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { categoryId, categoryName, displayName, createdBy } = req.body;

    if (!displayName || !createdBy) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: displayName, createdBy'
      });
    }

    const guild = req.app.locals.client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    // Verificar permisos del bot
    if (!guild.members.me.permissions.has([PermissionsBitField.Flags.ManageChannels])) {
      return res.status(403).json({
        success: false,
        error: 'Bot does not have permission to manage channels'
      });
    }

    // Obtener el conteo actual de miembros
    const memberCount = guild.memberCount;
    const channelName = `${displayName}: ${memberCount}`;

    // Configuración del canal
    const channelOptions = {
      name: channelName,
      type: 2, // Voice channel
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak],
          allow: [PermissionsBitField.Flags.ViewChannel]
        }
      ]
    };

    // Agregar categoría si se especifica
    if (categoryId) {
      const category = guild.channels.cache.get(categoryId);
      if (category && category.type === 4) { // Category channel
        channelOptions.parent = categoryId;
      }
    }

    // Crear el canal
    const newChannel = await guild.channels.create(channelOptions);

    // Guardar en la base de datos
    const memberCountChannel = new MemberCountChannel({
      guildId,
      channelId: newChannel.id,
      channelName: newChannel.name,
      categoryId: categoryId || null,
      categoryName: categoryName || null,
      displayName,
      createdBy
    });

    await memberCountChannel.save();

    res.json({
      success: true,
      message: 'Member count channel created successfully',
      channel: {
        id: newChannel.id,
        name: newChannel.name,
        displayName,
        memberCount
      }
    });

  } catch (error) {
    console.error('Error creating member count channel:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * DELETE /api/member-count/:guildId/:channelId
 * Elimina un canal de conteo de miembros
 */
router.delete('/:guildId/:channelId', async (req, res) => {
  try {
    const { guildId, channelId } = req.params;

    const guild = req.app.locals.client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    // Verificar permisos del bot
    if (!guild.members.me.permissions.has([PermissionsBitField.Flags.ManageChannels])) {
      return res.status(403).json({
        success: false,
        error: 'Bot does not have permission to manage channels'
      });
    }

    // Eliminar el canal de Discord
    const channel = guild.channels.cache.get(channelId);
    if (channel) {
      await channel.delete();
    }

    // Marcar como inactivo en la base de datos
    await MemberCountChannel.findOneAndUpdate(
      { guildId, channelId },
      { isActive: false }
    );

    res.json({
      success: true,
      message: 'Member count channel deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting member count channel:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PUT /api/member-count/:guildId/:channelId
 * Actualiza el nombre de visualización de un canal de conteo
 */
router.put('/:guildId/:channelId', async (req, res) => {
  try {
    const { guildId, channelId } = req.params;
    const { displayName } = req.body;

    if (!displayName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: displayName'
      });
    }

    const guild = req.app.locals.client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    // Verificar permisos del bot
    if (!guild.members.me.permissions.has([PermissionsBitField.Flags.ManageChannels])) {
      return res.status(403).json({
        success: false,
        error: 'Bot does not have permission to manage channels'
      });
    }

    // Actualizar en la base de datos
    const memberCountChannel = await MemberCountChannel.findOneAndUpdate(
      { guildId, channelId, isActive: true },
      { displayName },
      { new: true }
    );

    if (!memberCountChannel) {
      return res.status(404).json({
        success: false,
        error: 'Member count channel not found'
      });
    }

    // Actualizar el nombre del canal en Discord
    const channel = guild.channels.cache.get(channelId);
    if (channel) {
      const memberCount = guild.memberCount;
      const newChannelName = `${displayName}: ${memberCount}`;
      await channel.setName(newChannelName);
    }

    res.json({
      success: true,
      message: 'Member count channel updated successfully',
      channel: memberCountChannel
    });

  } catch (error) {
    console.error('Error updating member count channel:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router; 