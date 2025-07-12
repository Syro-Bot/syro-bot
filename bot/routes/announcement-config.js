/**
 * @fileoverview Announcement Configuration Routes
 *
 * Rutas para manejar la configuración de canales de announcement por servidor.
 * Permite a los administradores configurar un canal específico para recibir announcements.
 *
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 */

const express = require('express');
const router = express.Router();
const AnnouncementConfig = require('../models/AnnouncementConfig');

/**
 * GET /api/announcement-config/:guildId
 * Obtiene la configuración de announcement de un servidor
 */
router.get('/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;

    const config = await AnnouncementConfig.findOne({ guildId, isActive: true });
    
    res.json({
      success: true,
      configured: !!config,
      config: config || null
    });

  } catch (error) {
    console.error('Error fetching announcement config:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/announcement-config/:guildId
 * Configura el canal de announcement para un servidor
 */
router.post('/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { channelId, channelName, configuredBy } = req.body;

    if (!channelId || !channelName || !configuredBy) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: channelId, channelName, configuredBy'
      });
    }

    // Verificar que el canal existe y el bot tiene permisos
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

    if (!channel.permissionsFor(req.app.locals.client.user).has(['SendMessages', 'ViewChannel'])) {
      return res.status(403).json({
        success: false,
        error: 'Bot does not have permission to send messages in this channel'
      });
    }

    // Crear o actualizar la configuración
    const config = await AnnouncementConfig.findOneAndUpdate(
      { guildId },
      {
        channelId,
        channelName,
        configuredBy,
        isActive: true,
        configuredAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Announcement channel configured successfully',
      config
    });

  } catch (error) {
    console.error('Error configuring announcement channel:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/announcement-config/:guildId
 * Desactiva la configuración de announcement de un servidor
 */
router.delete('/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;

    const config = await AnnouncementConfig.findOneAndUpdate(
      { guildId },
      { isActive: false },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }

    res.json({
      success: true,
      message: 'Announcement configuration deactivated'
    });

  } catch (error) {
    console.error('Error deactivating announcement config:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router; 