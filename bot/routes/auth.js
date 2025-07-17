const express = require('express');
const axios = require('axios');
const { generateToken } = require('../utils/jwtUtils');
const { jwtAuthMiddleware } = require('../middleware/jwtAuth');
const rateLimit = require('express-rate-limit');
const router = express.Router();

/**
 * Rate limiter for authentication endpoints
 * Limits excessive requests to prevent brute-force and abuse.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  message: {
    error: 'Too many requests, please try again later.'
  }
});

// Apply rate limiting to sensitive auth endpoints
router.use('/login', authLimiter);
router.use('/callback', authLimiter);
router.use('/me', authLimiter);

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

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // Set to true in production
  sameSite: 'strict',
  maxAge: 20 * 60 * 1000 // 20 minutes
};

// Callback: recibe el code de Discord y genera JWT token
router.get('/callback', async (req, res) => {
  console.log('[AUTH] /callback called');
  console.log('[AUTH] Query params:', req.query);
  const code = req.query.code;
  const frontendRedirect = process.env.FRONTEND_REDIRECT || 'http://localhost:5173/dashboard';
  console.log('[AUTH] FRONTEND_REDIRECT:', process.env.FRONTEND_REDIRECT);
  console.log('[AUTH] frontendRedirect variable:', frontendRedirect);

  if (!code) {
    console.log('[AUTH] No code provided');
    console.log('[AUTH] Redirecting to:', frontendRedirect + '?error=no_code');
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
    const jwtToken = generateToken({
      ...userRes.data,
      discord_access_token: tokenRes.data.access_token
    });
    // Validar que el JWT es válido (tres partes separadas por punto)
    if (!jwtToken || typeof jwtToken !== 'string' || jwtToken.split('.').length !== 3) {
      console.error('[AUTH] JWT generado inválido:', jwtToken);
      return res.redirect(frontendRedirect + '?error=invalid_jwt');
    }
    // Set JWT as HttpOnly, Secure cookie
    res.cookie('syro-jwt-token', jwtToken, cookieOptions);
    console.log('[AUTH] JWT cookie seteada correctamente. Redirecting to:', frontendRedirect);
    // Redirect to frontend without token in URL
    return res.redirect(frontendRedirect);

  } catch (e) {
    console.error('[AUTH] Error in OAuth2:', e.message);
    console.error('[AUTH] Error response:', e.response?.data);
    console.error('[AUTH] Error status:', e.response?.status);
    console.error('[AUTH] Error headers:', e.response?.headers);

    let errorType = 'oauth_failed';
    if (e.response && e.response.status === 429) {
      errorType = 'oauth_rate_limit';
    }

    console.log('[AUTH] Redirecting with error:', errorType, 'to', frontendRedirect + '?error=' + errorType);
    res.redirect(frontendRedirect + '?error=' + errorType);
  }
});

// Cache simple en memoria para los guilds del usuario
const userGuildsCache = {};
const CACHE_TTL_MS = 60 * 1000; // 60 segundos

// /me: devuelve datos del usuario autenticado (ahora usa JWT)
router.get('/me', jwtAuthMiddleware, async (req, res) => {
  console.log('[AUTH] /me called for user:', req.user.username);

  try {
    // Los datos del usuario ya están en req.user (del JWT)
    const user = {
      id: req.user.id,
      username: req.user.username,
      avatar: req.user.avatar,
      discriminator: req.user.discriminator
    };

    const discordAccessToken = req.user.discord_access_token;
    if (!discordAccessToken) {
      return res.status(401).json({ error: 'No Discord access token found in JWT.' });
    }

    // --- CACHE LOGIC ---
    const cacheKey = user.id;
    const now = Date.now();
    if (
      userGuildsCache[cacheKey] &&
      (now - userGuildsCache[cacheKey].timestamp < CACHE_TTL_MS)
    ) {
      // Usar cache
      console.log('[AUTH] Returning cached guilds for user:', user.username);
      const allGuilds = userGuildsCache[cacheKey].guilds;
      return res.json({
        user: user,
        guilds: allGuilds,
        totalGuilds: allGuilds.length,
        accessibleGuilds: allGuilds.filter(g => g.botPresent).length
      });
    }
    // --- END CACHE LOGIC ---

    // 1. Obtener todos los servidores del usuario desde Discord
    let userGuilds = [];
    try {
      const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${discordAccessToken}` }
      });
      userGuilds = guildsRes.data;
    } catch (err) {
      if (err.response && err.response.status === 429) {
        console.error('[AUTH] Rate limit hit when fetching user guilds from Discord API');
        return res.status(429).json({ error: 'Rate limited by Discord. Please wait and try again.' });
      }
      if (err.response && err.response.status === 401) {
        console.error('[AUTH] Invalid Discord access token');
        return res.status(401).json({ error: 'Invalid Discord access token. Please log in again.' });
      }
      console.error('[AUTH] Error fetching user guilds from Discord API:', err.message);
      return res.status(500).json({ error: 'Failed to fetch user guilds from Discord.' });
    }

    // 2. Obtener los servidores donde está el bot
    const client = req.app.locals.client;
    const botGuildIds = client ? new Set(client.guilds.cache.map(g => g.id)) : new Set();

    // 3. Marcar cuáles tienen al bot y filtrar solo los que el usuario es owner o tiene permisos de admin
    const adminPerm = 0x8; // ADMINISTRATOR
    const allGuilds = userGuilds
      .filter(guild => (parseInt(guild.permissions) & adminPerm) === adminPerm)
      .map(guild => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        permissions: guild.permissions,
        owner: guild.owner,
        botPresent: botGuildIds.has(guild.id)
      }));

    // Guardar en cache
    userGuildsCache[cacheKey] = {
      guilds: allGuilds,
      timestamp: now
    };

    res.json({
      user: user,
      guilds: allGuilds,
      totalGuilds: allGuilds.length,
      accessibleGuilds: allGuilds.filter(g => g.botPresent).length
    });

  } catch (e) {
    console.error('[AUTH] Error in /me:', e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout: endpoint para invalidar token (opcional, ya que JWT es stateless)
router.post('/logout', (req, res) => {
  // Clear the JWT cookie on logout for security
  res.clearCookie('syro-jwt-token', cookieOptions);
  res.json({ success: true, message: 'Logged out successfully' });
});

// /guilds: devuelve los servidores donde está el bot
router.get('/guilds', (req, res) => {
  console.log('[AUTH] /guilds called');

  try {
    const client = req.app.locals.client;

    if (!client) {
      return res.status(500).json({
        success: false,
        error: 'Discord client not available'
      });
    }

    // Obtener todos los servidores donde está el bot
    const botGuilds = Array.from(client.guilds.cache.values()).map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL(),
      memberCount: guild.memberCount,
      owner: guild.ownerId
    }));

    console.log(`[AUTH] Bot is in ${botGuilds.length} guilds`);

    res.json({
      success: true,
      guilds: botGuilds,
      totalGuilds: botGuilds.length
    });

  } catch (error) {
    console.error('[AUTH] Error getting bot guilds:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// /test: endpoint de prueba para verificar que el bot esté funcionando
router.get('/test', (req, res) => {
  console.log('[AUTH] /test called');

  try {
    const client = req.app.locals.client;

    if (!client) {
      return res.json({
        success: false,
        error: 'Discord client not available',
        clientExists: false
      });
    }

    const botInfo = {
      clientExists: true,
      botUser: client.user ? {
        id: client.user.id,
        username: client.user.username,
        tag: client.user.tag
      } : null,
      guildCount: client.guilds.cache.size,
      status: client.ws.status,
      uptime: client.uptime
    };

    console.log('[AUTH] Bot info:', botInfo);

    res.json({
      success: true,
      botInfo
    });

  } catch (error) {
    console.error('[AUTH] Error in test endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router; 