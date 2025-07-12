/**
 * @fileoverview Global Announcement Routes
 *
 * Rutas para manejar el envío de anuncios globales a servidores configurados.
 * Solo el owner del bot puede usar esta funcionalidad.
 *
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 */

const express = require('express');
const router = express.Router();
const LogManager = require('../utils/logManager');
const AnnouncementConfig = require('../models/AnnouncementConfig');

/**
 * POST /api/global-announcement
 * Envía un anuncio global a todos los servidores configurados
 */
router.post('/', async (req, res) => {
  try {
    const { content, embeds } = req.body;
    
    // Verify that the request is from the bot owner
    const ownerId = process.env.OWNER_ID;
    if (!ownerId) {
      return res.status(500).json({
        success: false,
        error: 'Owner ID not configured'
      });
    }
    
    // Get user ID from headers
    const userId = req.headers['user-id'];
    if (!userId || userId !== ownerId) {
      console.log('Unauthorized global announcement attempt:', {
        userId,
        ownerId,
        expected: userId === ownerId
      });
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Only the bot owner can send global announcements'
      });
    }
    
    console.log('Global announcement request from authorized user:', userId);

    console.log('Global announcement request:', {
      hasContent: !!content,
      embedsCount: embeds?.length
    });

    if (!content && (!embeds || embeds.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Either content or embeds are required'
      });
    }

    const client = req.app.locals.client;
    if (!client) {
      return res.status(500).json({
        success: false,
        error: 'Discord client not available'
      });
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

    // Get all configured announcement channels
    const configs = await AnnouncementConfig.find({ isActive: true });
    
    if (configs.length === 0) {
      return res.json({
        success: true,
        message: 'No servers have configured announcement channels',
        successCount: 0,
        totalCount: 0,
        results: []
      });
    }

    // Send to all configured channels
    const results = [];
    let successCount = 0;

    for (const config of configs) {
      try {
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) {
          results.push({ 
            guildId: config.guildId, 
            success: false, 
            error: 'Server not found',
            channelName: config.channelName 
          });
          continue;
        }

        const channel = guild.channels.cache.get(config.channelId);
        if (!channel) {
          results.push({ 
            guildId: config.guildId, 
            success: false, 
            error: 'Configured channel not found',
            channelName: config.channelName 
          });
          continue;
        }

        if (!channel.permissionsFor(client.user).has(['SendMessages', 'ViewChannel'])) {
          results.push({ 
            guildId: config.guildId, 
            success: false, 
            error: 'Bot does not have permission to send messages in configured channel',
            channelName: config.channelName 
          });
          continue;
        }

        const messageOptions = {
          content: content || undefined,
          embeds: discordEmbeds.length > 0 ? discordEmbeds : undefined
        };

        await channel.send(messageOptions);
        results.push({ 
          guildId: config.guildId, 
          success: true, 
          guildName: guild.name,
          channelName: config.channelName 
        });
        successCount++;

      } catch (error) {
        console.error(`Error sending to guild ${config.guildId}:`, error);
        results.push({ 
          guildId: config.guildId, 
          success: false, 
          error: error.message,
          channelName: config.channelName 
        });
      }
    }

    // Log the global announcement
    await LogManager.logAnnouncement('GLOBAL', content, configs.map(c => c.guildId), successCount, 'Dashboard Web (Global)');

    res.json({
      success: true,
      message: `Global announcement sent to ${successCount}/${configs.length} configured servers`,
      successCount,
      totalCount: configs.length,
      results
    });

  } catch (error) {
    console.error('Error sending global announcement:', error);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router; 