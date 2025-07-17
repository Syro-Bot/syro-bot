/**
 * @fileoverview Announcement Routes
 *
 * Rutas para manejar el envío de anuncios con embeds.
 * Permite enviar mensajes formateados a múltiples canales.
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
 * Rate limiter for announcement endpoint
 * Prevents abuse and spam of announcements.
 */
const announcementLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 announcements per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many announcements, please try again later.'
  }
});

// Apply rate limiting to announcement endpoint
router.use('/', announcementLimiter);

/**
 * POST /api/announcement/:guildId
 * Envía un anuncio con embeds a múltiples canales
 */
router.post('/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { channels, content, embeds } = req.body;

    console.log('Announcement request:', {
      guildId,
      channels: channels?.length,
      hasContent: !!content,
      embedsCount: embeds?.length
    });

    if (!channels || channels.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one channel is required'
      });
    }

    if (!content && (!embeds || embeds.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Either content or embeds are required'
      });
    }

    const guild = req.app.locals.client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    // Verify bot permissions for all channels
    for (const channelId of channels) {
      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        return res.status(404).json({
          success: false,
          error: `Channel ${channelId} not found`
        });
      }

      if (!channel.permissionsFor(req.app.locals.client.user).has(['SendMessages', 'ViewChannel'])) {
        return res.status(403).json({
          success: false,
          error: `No permissions to send messages in #${channel.name}`
        });
      }
    }

    // Prepare embeds for Discord
    const discordEmbeds = (embeds || [])
      .filter(embed => embed.title || embed.description) // Only include embeds with content
      .map(embed => {
        const discordEmbed = {};
        
        if (embed.title && embed.title.trim()) discordEmbed.title = embed.title.trim();
        if (embed.description && embed.description.trim()) discordEmbed.description = embed.description.trim();
        if (embed.color && embed.color.startsWith('#')) {
          try {
            discordEmbed.color = parseInt(embed.color.replace('#', ''), 16);
          } catch (e) {
            console.warn('Invalid color format:', embed.color);
          }
        }
        if (embed.imageUrl && embed.imageUrl.trim()) {
          try {
            new URL(embed.imageUrl); // Validate URL
            discordEmbed.image = { url: embed.imageUrl.trim() };
          } catch (e) {
            console.warn('Invalid image URL:', embed.imageUrl);
          }
        }
        if (embed.author && embed.author.trim()) {
          discordEmbed.author = { name: embed.author.trim() };
          if (embed.authorUrl && embed.authorUrl.trim()) {
            try {
              new URL(embed.authorUrl); // Validate URL
              discordEmbed.author.url = embed.authorUrl.trim();
            } catch (e) {
              console.warn('Invalid author URL:', embed.authorUrl);
            }
          }
          if (embed.authorIconUrl && embed.authorIconUrl.trim()) {
            try {
              new URL(embed.authorIconUrl); // Validate URL
              discordEmbed.author.icon_url = embed.authorIconUrl.trim();
            } catch (e) {
              console.warn('Invalid author icon URL:', embed.authorIconUrl);
            }
          }
        }
        
        return discordEmbed;
      })
      .filter(embed => Object.keys(embed).length > 0); // Remove empty embeds

    // Send to all selected channels
    const results = [];
    for (const channelId of channels) {
      try {
        const channel = guild.channels.cache.get(channelId);
        const messageOptions = {
          content: content || undefined,
          embeds: discordEmbeds.length > 0 ? discordEmbeds : undefined
        };

        await channel.send(messageOptions);
        results.push({ channelId, success: true, channelName: channel.name });
      } catch (error) {
        console.error(`Error sending to channel ${channelId}:`, error);
        console.error('Message options:', JSON.stringify({
          content: content || undefined,
          embeds: discordEmbeds
        }, null, 2));
        results.push({ channelId, success: false, error: error.message });
      }
    }

    // Log the announcement
    const successCount = results.filter(r => r.success).length;
    await LogManager.logAnnouncement(guildId, content, channels, successCount, 'Dashboard Web');

    res.json({
      success: true,
      message: `Announcement sent to ${successCount}/${channels.length} channels`,
      results
    });

  } catch (error) {
    console.error('Error sending announcement:', error);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    console.error('Guild ID:', req.params.guildId);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router; 