const express = require('express');
const axios = require('axios');
const router = express.Router();

// Variables de entorno
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3001/callback';

// Login: redirige a Discord OAuth2
router.get('/login', (req, res) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds'
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

// Callback: recibe el code de Discord y guarda el token en sesión
router.get('/callback', async (req, res) => {
  const code = req.query.code;
  const frontendRedirect = process.env.FRONTEND_REDIRECT || 'http://localhost:5173/dashboard';
  if (!code) return res.redirect(frontendRedirect + '?error=no_code');
  try {
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      scope: 'identify guilds'
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    req.session.token = tokenRes.data.access_token;
    req.session.save((err) => {
      if (err) {
        return res.redirect(frontendRedirect + '?error=session_save');
      } else {
        res.redirect(frontendRedirect);
      }
    });
  } catch (e) {
    let errorType = 'oauth_failed';
    if (e.response && e.response.status === 429) {
      errorType = 'oauth_rate_limit';
    }
    res.redirect(frontendRedirect + '?error=' + errorType);
  }
});

// /me: devuelve datos del usuario autenticado
router.get('/me', async (req, res) => {
  try {
    if (!req.session.token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    // Obtiene datos del usuario y guilds desde Discord
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${req.session.token}` }
    });
    const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${req.session.token}` }
    });
    res.json({
      user: userRes.data,
      guilds: guildsRes.data,
      totalGuilds: guildsRes.data.length,
      accessibleGuilds: guildsRes.data.filter(g => (g.permissions & 0x20) === 0x20).length // admin perms
    });
  } catch (e) {
    if (e.response?.status === 401) {
      req.session.destroy();
      return res.status(401).json({ error: 'Invalid Discord token' });
    }
    if (e.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded, please try again' });
    }
    res.status(500).json({ error: 'Discord API error' });
  }
});

module.exports = router; 