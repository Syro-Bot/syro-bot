const express = require('express');
const router = express.Router();

// Dummy logs endpoint
router.get('/logs/:guildId', (req, res) => {
  res.json({ success: true, logs: [] });
});

// Dummy stats joins endpoint
router.get('/stats/joins', (req, res) => {
  res.json({ success: true, joins: 0 });
});

// Dummy automod rules endpoint
router.get('/servers/:guildId/automod/rules', (req, res) => {
  res.json({ success: true, rules: [] });
});

// Dummy templates pending endpoint
router.post('/templates/pending', (req, res) => {
  res.json({ success: true, templates: [] });
});

module.exports = router; 