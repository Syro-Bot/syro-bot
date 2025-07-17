/**
 * @fileoverview Channels Routes
 *
 * Rutas para manejar operaciones relacionadas con canales de Discord.
 * Incluye endpoints para obtener canales y realizar operaciones como nuke.
 *
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for channels endpoints
 * Prevents abuse and excessive requests.
 */
const channelsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many channel requests, please try again later.'
  }
});

// Apply rate limiting to all channels endpoints
router.use('/', channelsLimiter);

/**
 * GET /api/channels/:guildId
 * Obtiene todos los canales de un servidor
 */
router.get('/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = req.app.locals.client.guilds.cache.get(guildId);

    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    // Obtener todos los canales del servidor
    const channels = guild.channels.cache
      .filter(channel => channel.type === 0 || channel.type === 2 || channel.type === 4) // Text, voice, and category channels
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        position: channel.position,
        parent: channel.parent?.name || null,
        parentId: channel.parentId || null
      }))
      .sort((a, b) => a.position - b.position);

    res.json({
      success: true,
      channels: channels
    });

  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router; 