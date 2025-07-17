const express = require('express');
const router = express.Router();

// Dummy logs endpoint - matches frontend URL
router.get('/logs/:guildId', (req, res) => {
  console.log(`[DUMMY] Logs requested for guild: ${req.params.guildId}`);
  res.json({ 
    success: true, 
    logs: [
      {
        _id: '1',
        type: 'user_join',
        title: 'Usuario se unió',
        description: 'Un nuevo usuario se unió al servidor',
        timestamp: new Date().toISOString(),
        severity: 'info'
      },
      {
        _id: '2',
        type: 'automod_action',
        title: 'Acción de automod',
        description: 'Se detectó spam y se tomó acción automática',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        severity: 'warning'
      }
    ] 
  });
});

// Dummy stats joins endpoint - matches frontend URL
router.get('/stats/joins', (req, res) => {
  console.log(`[DUMMY] Stats joins requested for guild: ${req.query.guildId}`);
  
  // Generate dummy data for the last 15 days
  const data = [];
  const totalJoins = Math.floor(Math.random() * 50) + 10; // Random number between 10-60
  
  for (let i = 14; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      joins: Math.floor(Math.random() * 8) + 1, // Random number between 1-8
      timestamp: date.toISOString()
    });
  }
  
  res.json({ 
    success: true, 
    data,
    totalJoins
  });
});

// Dummy automod rules endpoint - matches frontend URL
router.get('/automod/servers/:guildId/rules', (req, res) => {
  console.log(`[DUMMY] Automod rules requested for guild: ${req.params.guildId}`);
  res.json({ 
    success: true, 
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
});

module.exports = router; 