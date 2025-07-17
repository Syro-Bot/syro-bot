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
    // Los datos del usuario ya están en req.user (del JWT)
    const user = {
      id: req.user.id,
      username: req.user.username,
      avatar: req.user.avatar,
      discriminator: req.user.discriminator
    };
    
    // Obtener los servidores del usuario desde Discord
    // Para esto necesitamos el access_token de Discord
    // Como no lo tenemos en el JWT, vamos a implementar una solución alternativa
    
    // Opción 1: Obtener guilds usando el bot client (si el usuario está en servidores donde está el bot)
    const client = req.app.locals.client;
    let userGuilds = [];
    let totalGuilds = 0;
    let accessibleGuilds = 0;
    
    if (client) {
      try {
        // Obtener todos los servidores donde está el bot
        const botGuilds = client.guilds.cache;
        
        // Filtrar servidores donde el usuario es miembro y tiene permisos de administrador
        for (const [guildId, guild] of botGuilds) {
          try {
            // Obtener el miembro del usuario en este servidor
            const member = await guild.members.fetch(user.id);
            
            // Verificar si tiene permisos de administrador
            if (member.permissions.has('Administrator')) {
              userGuilds.push({
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                permissions: member.permissions.bitfield.toString(),
                owner: guild.ownerId === user.id,
                botPresent: true
              });
              accessibleGuilds++;
            }
          } catch (memberError) {
            // El usuario no es miembro de este servidor
            console.log(`[AUTH] User ${user.username} is not a member of guild ${guild.name}`);
          }
        }
        
        totalGuilds = userGuilds.length;
        
        console.log(`[AUTH] Found ${userGuilds.length} accessible guilds for user ${user.username}`);
        
      } catch (error) {
        console.error('[AUTH] Error fetching user guilds:', error);
        // Si hay error, devolvemos array vacío pero no fallamos
        userGuilds = [];
      }
    }
    
    res.json({
      user: user,
      guilds: userGuilds,
      totalGuilds: totalGuilds,
      accessibleGuilds: accessibleGuilds
    });
    
  } catch (e) {
    console.error('[AUTH] Error in /me:', e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout: endpoint para invalidar token (opcional, ya que JWT es stateless)
router.post('/logout', (req, res) => {
  console.log('[AUTH] Logout called');
  // JWT es stateless, así que no hay nada que invalidar en el servidor
  // El frontend debe eliminar el token del localStorage
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