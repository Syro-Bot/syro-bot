/**
 * Health Check Routes Module
 * 
 * Provides health check and monitoring endpoints
 * for the Syro Discord bot API server.
 * 
 * @author Syro Development Team
 * @version 2.0.0
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * Basic health check endpoint
 * @route GET /api/health
 * @returns {Object} Basic health status
 */
router.get('/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.json(health);
  } catch (error) {
    logger.errorWithContext(error, { context: 'Health check' });
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

/**
 * Bot status endpoint
 * @route GET /api/status
 * @returns {Object} Bot status information
 */
router.get('/status', (req, res) => {
  try {
    const discordClient = req.app.locals.client;
    
    res.json({
      status: 'online',
      bot: discordClient?.user ? discordClient.user.tag : 'Connecting...',
      guilds: discordClient?.guilds?.cache?.size || 0,
      uptime: discordClient?.uptime || 0,
      ping: discordClient?.ws?.ping || null
    });
  } catch (error) {
    logger.errorWithContext(error, { context: 'Status check' });
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Bot guilds endpoint (for debugging)
 * @route GET /api/bot-guilds
 * @returns {Object} List of guilds the bot is present in
 */
router.get('/bot-guilds', (req, res) => {
  try {
    const discordClient = req.app.locals.client;
    
    const botGuilds = discordClient?.guilds?.cache?.map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL(),
      memberCount: guild.memberCount,
      owner: guild.ownerId
    })) || [];
    
    res.json({ 
      success: true, 
      botGuilds,
      totalBotGuilds: botGuilds.length
    });
  } catch (error) {
    logger.errorWithContext(error, { context: 'Bot guilds check' });
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router; 