const express = require('express');
const router = express.Router();
const LogManager = require('../utils/logManager');
const ServerConfig = require('../models/ServerConfig');
const Join = require('../models/Join');

// Real logs endpoint - connects to MongoDB
router.get('/logs/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { limit = 30 } = req.query;
    
    console.log(`[LOGS] Logs requested for guild: ${guildId}, limit: ${limit}`);
    
    // Get logs from MongoDB using LogManager
    const logs = await LogManager.getRecentLogs(guildId, parseInt(limit));
    
    res.json({ 
      success: true, 
      logs: logs || []
    });
  } catch (error) {
    console.error('[LOGS] Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Real stats joins endpoint - connects to MongoDB
router.get('/stats/joins', async (req, res) => {
  try {
    const { guildId } = req.query;
    
    if (!guildId) {
      return res.status(400).json({ 
        success: false, 
        error: 'guildId parameter is required' 
      });
    }
    
    console.log(`[STATS] Stats joins requested for guild: ${guildId}`);
    
    // Get real join data from MongoDB
    const currentDate = new Date();
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(currentDate.getDate() - 15);

    const recentJoins = await Join.find({
      guildId: guildId,
      timestamp: { $gte: fifteenDaysAgo }
    }).sort({ timestamp: 1 });

    // Group joins by date
    const joinsByDate = {};
    let totalJoins = 0;

    recentJoins.forEach(join => {
      const dateKey = join.timestamp.toISOString().split('T')[0];
      if (!joinsByDate[dateKey]) {
        joinsByDate[dateKey] = 0;
      }
      joinsByDate[dateKey]++;
      totalJoins++;
    });

    // Generate data for the last 15 days
    const data = [];
    for (let i = 14; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      data.push({
        date: dateKey,
        joins: joinsByDate[dateKey] || 0,
        timestamp: date.toISOString()
      });
    }
    
    res.json({ 
      success: true, 
      data,
      totalJoins
    });
  } catch (error) {
    console.error('[STATS] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Real automod rules endpoint - connects to MongoDB
router.get('/automod/servers/:guildId/rules', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    console.log(`[AUTOMOD] Rules requested for guild: ${guildId}`);
    
    // Get real automod rules from MongoDB
    let serverConfig = await ServerConfig.findOne({ serverId: guildId });
    
    if (!serverConfig) {
      console.log(`[AUTOMOD] Creating default config for guild: ${guildId}`);
      // Create default configuration if none exists
      serverConfig = new ServerConfig({
        serverId: guildId,
        automodRules: {
          Spam: [],
          Words: [],
          Links: [],
          Raids: [],
          Mentions: [],
          NSFW: [],
          Caps: [],
          Emojis: [],
          Flood: [],
          Slowmode: [],
          Mute: [],
          Logs: []
        }
      });
      await serverConfig.save();
      console.log(`[AUTOMOD] Default config created for guild: ${guildId}`);
    } else {
      console.log(`[AUTOMOD] Found existing config for guild: ${guildId}`);
    }
    
    res.json({ 
      success: true, 
      automodRules: serverConfig.automodRules || {
        Spam: [],
        Words: [],
        Links: [],
        Raids: [],
        Mentions: [],
        NSFW: [],
        Caps: [],
        Emojis: [],
        Flood: [],
        Slowmode: [],
        Mute: [],
        Logs: []
      }
    });
  } catch (error) {
    console.error('[AUTOMOD] Error fetching rules:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router; 