const express = require('express');
const axios = require('axios');
const { generateToken } = require('../utils/jwtUtils');
const { jwtAuthMiddleware } = require('../middleware/jwtAuth');
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

// Callback: recibe el code de Discord y genera JWT token
router.get('/callback', async (req, res) => {
  console.log('[AUTH] /callback called');
  console.log('[AUTH] Query params:', req.query);
  const code = req.query.code;
  const frontendRedirect = process.env.FRONTEND_REDIRECT || 'http://localhost:5173/dashboard';
  
  if (!code) {
    console.log('[AUTH] No code provided');
    return res.redirect(frontendRedirect + '?error=no_code');
  }
  
  try {
    console.log('[AUTH] Starting OAuth2 token exchange...');
    // Intercambiar code por token de Discord
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
    
    console.log('[AUTH] Discord token received successfully');
    console.log('[AUTH] Token response keys:', Object.keys(tokenRes.data));
    
    // Obtener datos del usuario desde Discord
    console.log('[AUTH] Fetching user data from Discord...');
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }
    });
    
    console.log('[AUTH] User data received successfully:', userRes.data.username);
    console.log('[AUTH] User data keys:', Object.keys(userRes.data));
    
    // Generar JWT token
    console.log('[AUTH] Generating JWT token...');
    const jwtToken = generateToken(userRes.data);
    
    console.log('[AUTH] JWT token generated successfully');
    
    // Redirigir al frontend con el token
    const redirectUrl = `${frontendRedirect}?token=${encodeURIComponent(jwtToken)}`;
    console.log('[AUTH] Redirecting to:', redirectUrl);
    
    res.status(200).send(`
      <html>
        <head>
          <meta http-equiv="refresh" content="0;url=${redirectUrl}" />
          <script>
            window.location.href = "${redirectUrl}";
          </script>
        </head>
        <body>
          <p>Redirecting with token...</p>
        </body>
      </html>
    `);
    
  } catch (e) {
    console.error('[AUTH] Error in OAuth2:', e.message);
    console.error('[AUTH] Error response:', e.response?.data);
    console.error('[AUTH] Error status:', e.response?.status);
    console.error('[AUTH] Error headers:', e.response?.headers);
    
    let errorType = 'oauth_failed';
    if (e.response && e.response.status === 429) {
      errorType = 'oauth_rate_limit';
    }
    
    console.log('[AUTH] Redirecting with error:', errorType);
    res.redirect(frontendRedirect + '?error=' + errorType);
  }
});

// /me: devuelve datos del usuario autenticado (ahora usa JWT)
router.get('/me', jwtAuthMiddleware, async (req, res) => {
  console.log('[AUTH] /me called for user:', req.user.username);
  
  try {
    // Usar el token de Discord almacenado en el JWT o hacer una nueva petición
    // Por ahora, vamos a hacer una petición a Discord para obtener datos actualizados
    const discordTokenRes = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials'
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    // Obtener datos del usuario y guilds desde Discord usando el ID del JWT
    const userRes = await axios.get(`https://discord.com/api/users/${req.user.id}`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` }
    });
    
    const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${discordTokenRes.data.access_token}` }
    });
    
    res.json({
      user: {
        ...userRes.data,
        id: req.user.id,
        username: req.user.username,
        avatar: req.user.avatar,
        discriminator: req.user.discriminator
      },
      guilds: guildsRes.data,
      totalGuilds: guildsRes.data.length,
      accessibleGuilds: guildsRes.data.filter(g => (g.permissions & 0x20) === 0x20).length // admin perms
    });
    
  } catch (e) {
    console.error('[AUTH] Error in /me:', e.message);
    if (e.response?.status === 401) {
      return res.status(401).json({ error: 'Invalid Discord token' });
    }
    if (e.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded, please try again' });
    }
    res.status(500).json({ error: 'Discord API error' });
  }
});

// Logout: endpoint para invalidar token (opcional, ya que JWT es stateless)
router.post('/logout', (req, res) => {
  console.log('[AUTH] Logout called');
  // JWT es stateless, así que no hay nada que invalidar en el servidor
  // El frontend debe eliminar el token del localStorage
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router; 