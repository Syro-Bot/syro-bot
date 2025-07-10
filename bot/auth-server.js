/**
 * Syro Authentication Server
 * 
 * This server handles Discord OAuth2 authentication for the Syro web dashboard.
 * It manages user login, session management, and Discord API token exchange.
 * 
 * Features:
 * - Discord OAuth2 authentication flow
 * - Session management for logged-in users
 * - User and guild data retrieval from Discord API
 * - Bot invitation URL generation
 * - CORS configuration for frontend communication
 * 
 * OAuth2 Flow:
 * 1. User clicks login → redirects to Discord OAuth2
 * 2. User authorizes → Discord redirects back with code
 * 3. Server exchanges code for access token
 * 4. Server stores token in session
 * 5. Frontend can now access user data via /me endpoint
 * 
 * @author Syro Development Team
 * @version 1.0.0
 * @requires express
 * @requires discord.js
 * @requires axios
 */

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
require('dotenv').config();

/**
 * Express Application Setup
 * Creates and configures the authentication server
 */
const app = express();
const PORT = process.env.AUTH_PORT || 3002;

/**
 * CORS Configuration
 * Enables cross-origin requests from the frontend
 * Must be configured before session middleware
 */
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

/**
 * Preflight CORS Handler
 * Handles OPTIONS requests for CORS preflight checks
 */
app.options('*', cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

/**
 * CORS Headers Middleware
 * Ensures credentials are allowed in all responses
 */
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

/**
 * Rate Limiting for Authentication
 * Protects against brute force attacks and abuse
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 auth attempts per 15 minutes (increased for development)
  message: {
    success: false,
    error: 'Too many authentication attempts from this IP, please try again later.'
  },
  handler: (req, res) => {
    logger.warn(`🚫 Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts from this IP, please try again later.',
      retryAfter: 15
    });
  }
});

// Apply rate limiting to auth endpoints
app.use('/login', authLimiter);
app.use('/callback', authLimiter);
// Temporarily disable rate limiting for /me endpoint during development
// app.use('/me', authLimiter);

/**
 * Session Configuration
 * Manages user sessions for authentication state
 */
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

/**
 * Clear Rate Limit Endpoint (Development Only)
 * Allows clearing rate limit for testing purposes
 */
if (process.env.NODE_ENV === 'development') {
  app.post('/clear-rate-limit', (req, res) => {
    // Clear rate limit for the current IP
    authLimiter.resetKey(req.ip);
    logger.info(`✅ Rate limit cleared for IP: ${req.ip}`);
    res.json({ 
      success: true, 
      message: 'Rate limit cleared for this IP',
      warning: 'This endpoint is only available in development mode'
    });
  });
}

/**
 * Discord OAuth2 Configuration
 * Environment variables for Discord application credentials
 */
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3002/callback';
const BOT_INVITE = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

/**
 * Login Endpoint
 * Initiates the Discord OAuth2 flow by redirecting to Discord's authorization page
 * 
 * @route GET /login
 * @returns {Redirect} Redirects to Discord OAuth2 authorization URL
 */
app.get('/login', (req, res) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds'
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

/**
 * OAuth2 Callback Endpoint
 * Handles the callback from Discord after user authorization
 * Exchanges authorization code for access token
 * 
 * @route GET /callback
 * @param {string} code - Authorization code from Discord
 * @returns {Redirect} Redirects to dashboard on success
 */
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('No code provided');
  
  try {
    // Exchange authorization code for access token
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
    
    // Store access token in session
    req.session.token = tokenRes.data.access_token;
    logger.info('✅ Token stored in session:', req.sessionID);
    logger.debug('🔑 Session token length:', req.session.token ? req.session.token.length : 0);
    
    // Save session before redirect
    req.session.save((err) => {
      if (err) {
        logger.error('❌ Error saving session:', err);
        res.status(500).send('Session save error');
      } else {
        logger.info('✅ Session saved successfully');
        res.redirect('http://localhost:5173/dashboard');
      }
    });
  } catch (e) {
    res.status(500).send('OAuth2 Error: ' + e.message);
  }
});

// Simple cache for user data
const userCache = new Map();
const CACHE_DURATION = 30 * 1000; // 30 seconds

/**
 * User Data Endpoint
 * Retrieves current user information and their Discord servers
 * Requires valid session with access token
 * 
 * @route GET /me
 * @returns {Object} JSON response with user and guilds data
 */
app.get('/me', async (req, res) => {
  logger.info('🔍 /me endpoint called');
  logger.debug('🔍 Session ID:', req.sessionID);
  logger.debug('🔑 Session token exists:', !!req.session.token);
  
  if (!req.session.token) {
    logger.warn('❌ No token in session, returning 401');
    return res.status(401).json({ error: 'Not logged in' });
  }
  
  // Check cache first
  const cacheKey = req.session.token;
  const cached = userCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logger.info('✅ Returning cached user data');
    return res.json(cached.data);
  }
  
  try {
    logger.info('✅ Token found, fetching Discord data...');
    
    // Fetch user data first
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${req.session.token}` }
    });
    
    // Add longer delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Fetch guilds data
    const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${req.session.token}` }
    });
    
    // Filter guilds based on permissions
    const allGuilds = guildsRes.data;
    const filteredGuilds = allGuilds.filter(guild => {
      // Check if user has admin or manage server permissions
      const permissions = BigInt(guild.permissions || '0');
      const ADMINISTRATOR = BigInt(0x8);
      const MANAGE_GUILD = BigInt(0x20);
      
      return (permissions & (ADMINISTRATOR | MANAGE_GUILD)) !== BigInt(0);
    });
    
    // Add permission flags to each guild
    const guildsWithPermissions = filteredGuilds.map(guild => {
      const permissions = BigInt(guild.permissions || '0');
      const ADMINISTRATOR = BigInt(0x8);
      const MANAGE_GUILD = BigInt(0x20);
      
      return {
        ...guild,
        hasAdminPermissions: (permissions & ADMINISTRATOR) === ADMINISTRATOR,
        hasManagePermissions: (permissions & MANAGE_GUILD) !== BigInt(0) || (permissions & ADMINISTRATOR) === ADMINISTRATOR
      };
    });
    
    const data = { 
      user: userRes.data, 
      guilds: guildsWithPermissions,
      totalGuilds: allGuilds.length,
      accessibleGuilds: guildsWithPermissions.length
    };
    
    // Store user guilds in session for middleware access
    req.session.userGuilds = allGuilds;
    req.session.userId = userRes.data.id;
    
    // Cache the result
    userCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    logger.info(`✅ Discord data fetched and cached successfully. User has access to ${guildsWithPermissions.length}/${allGuilds.length} guilds`);
    res.json(data);
  } catch (e) {
    logger.error('❌ Error fetching Discord data:', e.message);
    logger.debug('📊 Error status:', e.response?.status);
    logger.debug('📊 Error data:', e.response?.data);
    
    // Handle different error types
    if (e.response?.status === 429) {
      logger.warn('⚠️ Rate limit hit, but keeping session');
      // Don't clear session on rate limit, just return error
      res.status(429).json({ 
        error: 'Rate limit exceeded, please try again',
        retry_after: Math.max(e.response?.data?.retry_after || 5, 5) // Minimum 5 seconds
      });
    } else if (e.response?.status === 401) {
      logger.warn('⚠️ Discord token invalid, clearing session');
      req.session.destroy();
      res.status(401).json({ error: 'Invalid Discord token' });
    } else {
      logger.warn('⚠️ Other Discord API error, keeping session');
      res.status(500).json({ error: 'Discord API error' });
    }
  }
});

/**
 * Logout Endpoint
 * Destroys the user session and clears authentication cookies
 * 
 * @route POST /logout
 * @returns {Object} JSON response confirming logout
 */
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

/**
 * Clear Session Endpoint
 * Clears the current session without logging out
 * Useful for switching between Discord accounts
 * 
 * @route POST /clear-session
 * @returns {Object} JSON response confirming session cleared
 */
app.post('/clear-session', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true, message: 'Session cleared' });
  });
});

/**
 * Clear Cache Endpoint
 * Clears the user data cache
 * Useful for forcing fresh data fetch
 * 
 * @route POST /clear-cache
 * @returns {Object} JSON response confirming cache cleared
 */
app.post('/clear-cache', (req, res) => {
  userCache.clear();
  logger.info('🗑️ User cache cleared');
  res.json({ ok: true, message: 'Cache cleared' });
});

/**
 * Bot Invite Endpoint
 * Provides the Discord bot invitation URL for server administrators
 * 
 * @route GET /invite
 * @returns {Object} JSON response with bot invitation URL
 */
app.get('/invite', (req, res) => {
  res.json({ url: BOT_INVITE });
});

/**
 * Bot Invite with Guild Selection Endpoint
 * Provides a bot invitation URL that allows selecting a specific guild
 * 
 * @route GET /invite/:guildId
 * @param {string} guildId - Discord guild ID to pre-select
 * @returns {Object} JSON response with bot invitation URL
 */
app.get('/invite/:guildId', (req, res) => {
  const { guildId } = req.params;
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guildId}`;
  res.json({ url: inviteUrl });
});

/**
 * Server Startup
 * Starts the authentication server on the configured port
 */
app.listen(PORT, () => {
  logger.info(`Auth server running on http://localhost:${PORT}`);
}); 