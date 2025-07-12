/**
 * Syro Web Dashboard API Server
 * 
 * This is the main Express.js server that provides the REST API for the Syro web dashboard.
 * It handles all HTTP requests from the frontend, manages file uploads, and provides
 * Discord bot integration for server management.
 * 
 * Features:
 * - REST API endpoints for dashboard functionality
 * - File upload handling for template icons
 * - Discord bot integration for server data
 * - Session management for user authentication
 * - MongoDB integration for data persistence
 * - CORS configuration for frontend communication
 * 
 * @author Syro Development Team
 * @version 1.0.0
 * @requires express
 * @requires discord.js
 * @requires mongoose
 */

const express = require('express');
const cors = require('cors');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const bodyParser = require('body-parser');
const fs = require('fs');
const mongoose = require('mongoose');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const Join = require('./models/Join');
const Template = require('./models/Template');
const ServerConfig = require('./models/ServerConfig');
const WelcomeConfig = require('./models/WelcomeConfig');
const multer = require('multer');
const path = require('path');
const { validateDiscordPermissions, validateBotPresence } = require('./middleware/auth');
const { sanitizeAll, sanitizeUrls, sanitizeFileUploads } = require('./middleware/sanitizer');

/**
 * File Upload Configuration
 * Sets up multer for handling file uploads (template icons, etc.)
 */

// Create uploads directory if it doesn't exist
const fsExtra = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fsExtra.existsSync(uploadsDir)) {
  fsExtra.mkdirSync(uploadsDir);
}

/**
 * Multer Storage Configuration
 * Configures how uploaded files are stored and named
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

/**
 * Express Application Setup
 * Creates and configures the main Express application
 */
const app = express();

/**
 * Static File Serving
 * Serves uploaded files (images, etc.) as static assets
 */
app.use('/uploads', express.static(uploadsDir));

/**
 * File Upload Endpoint
 * Handles image uploads for template icons and other media
 * 
 * @route POST /api/upload
 * @param {File} image - The image file to upload
 * @returns {Object} JSON response with the uploaded file URL
 */
app.post('/api/upload', /* uploadLimiter, */ sanitizeFileUploads(), upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image was uploaded' });
  }

  // Validate file type
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(',');
  if (!allowedTypes.includes(req.file.mimetype)) {
    // Delete the uploaded file
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ 
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
    });
  }

  // Validate file size
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 26214400; // 25MB default
  if (req.file.size > maxSize) {
    // Delete the uploaded file
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ 
      error: `File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB` 
    });
  }

  // Build the public URL for the uploaded file
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

/**
 * Database Connection
 * Connects to MongoDB Atlas for data persistence
 */
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => logger.database('Connected to MongoDB Atlas'))
.catch(err => logger.errorWithContext(err, { context: 'MongoDB connection' }));

/**
 * CORS Configuration
 * Enables cross-origin requests from the frontend
 */
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

/**
 * Rate Limiting Configuration
 * Protects against DoS attacks and abuse
 */
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.rateLimit(req.ip, req.url);
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 / 60) || 15
    });
  }
});

// Apply rate limiting to all routes
// app.use(limiter); // Temporarily disabled for debugging

/**
 * Specific Rate Limiting for Critical Endpoints
 * Stricter limits for sensitive operations
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 uploads per 15 minutes
  message: {
    success: false,
    error: 'Too many uploads from this IP, please try again later.'
  },
  handler: (req, res) => {
    logger.rateLimit(req.ip, 'upload');
    res.status(429).json({
      success: false,
      error: 'Too many uploads from this IP, please try again later.'
    });
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth attempts per 15 minutes
  message: {
    success: false,
    error: 'Too many authentication attempts from this IP, please try again later.'
  },
  handler: (req, res) => {
    logger.rateLimit(req.ip, 'auth');
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts from this IP, please try again later.'
    });
  }
});

/**
 * Body Parser Middleware
 * Parses JSON request bodies with a 25MB limit for file uploads
 */
app.use(bodyParser.json({ limit: '25mb' }));

/**
 * Session Configuration
 * Manages user sessions for authentication
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
 * Session Debug Endpoint
 * Shows current session information for debugging
 * 
 * @route GET /api/session-debug
 * @returns {Object} JSON response with session info
 */
app.get('/api/session-debug', (req, res) => {
  try {
    const sessionInfo = {
      sessionID: req.sessionID,
      hasSession: !!req.session,
      hasToken: !!req.session?.token,
      hasUserGuilds: !!req.session?.userGuilds,
      userGuildsCount: req.session?.userGuilds?.length || 0,
      userId: req.session?.userId,
      sessionData: req.session ? Object.keys(req.session) : []
    };
    
    res.json({
      success: true,
      sessionInfo
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Make Discord client available to middleware
app.set('discordClient', client);

/**
 * Global Error Handler Middleware
 * Catches and logs all unhandled errors
 */
app.use((err, req, res, next) => {
  logger.errorWithContext(err, {
    url: req.url,
    method: req.method,
    body: req.body,
    ip: req.ip
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

let welcomeConfigs = {}; // { guildId: { channelId, config } }

// Cargar config al iniciar
if (fs.existsSync('./welcomeConfigs.json')) {
  try {
    welcomeConfigs = JSON.parse(fs.readFileSync('./welcomeConfigs.json', 'utf8'));
    logger.bot('Welcome configs loaded from disk');
  } catch (e) {
    logger.errorWithContext(e, { context: 'Loading welcome configs' });
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    bot: client.user ? client.user.tag : 'Connecting...',
    guilds: client.guilds.cache.size,
    uptime: client.uptime
  });
});

/**
 * Bot Guilds Endpoint (Temporary for debugging)
 * Shows which guilds the bot is present in
 * 
 * @route GET /api/bot-guilds
 * @returns {Object} JSON response with bot guilds
 */
app.get('/api/bot-guilds', (req, res) => {
  try {
    const botGuilds = client.guilds.cache.map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL(),
      memberCount: guild.memberCount,
      owner: guild.ownerId
    }));
    
    res.json({ 
      success: true, 
      botGuilds,
      totalBotGuilds: botGuilds.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Bot Invite Endpoint
 * Generates bot invitation links for specific guilds
 * 
 * @route GET /api/bot-invite/:guildId
 * @param {string} guildId - Discord guild ID
 * @returns {Object} JSON response with bot invitation URL
 */
app.get('/api/bot-invite/:guildId', (req, res) => {
  try {
    const { guildId } = req.params;
    const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
    
    if (!CLIENT_ID) {
      return res.status(500).json({
        success: false,
        error: 'Bot client ID not configured'
      });
    }
    
    // Generate invite URL with admin permissions
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guildId}`;
    
    res.json({
      success: true,
      inviteUrl,
      guildId,
      instructions: 'Click the link to invite the bot to this server'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rutas de automoderación
const automodRoutes = require('./routes/automod');
app.use('/api', automodRoutes);

// Hacer el cliente de Discord disponible para las rutas
app.locals.client = client;

// Rutas de canales
const channelsRoutes = require('./routes/channels');
app.use('/api/channels', channelsRoutes);

// Rutas de nuke
const nukeRoutes = require('./routes/nuke');
app.use('/api/nuke', nukeRoutes);

// Rutas de announcement
const announcementRoutes = require('./routes/announcement');
app.use('/api/announcement', announcementRoutes);

// Rutas de global announcement
const globalAnnouncementRoutes = require('./routes/global-announcement');
app.use('/api/global-announcement', globalAnnouncementRoutes);

// Rutas de announcement config
const announcementConfigRoutes = require('./routes/announcement-config');
app.use('/api/announcement-config', announcementConfigRoutes);

/**
 * Permission Check Endpoint
 * Verifies if the current user has specific permissions in a guild
 * 
 * @route GET /api/permissions/:guildId
 * @param {string} guildId - Discord guild ID
 * @returns {Object} JSON response with permission status
 */
app.get('/api/permissions/:guildId', 
  validateBotPresence(),
  async (req, res) => {
  try {
    const { guildId } = req.params;
    
    // Get user guilds from session
    const userGuilds = req.session?.userGuilds;
    
    if (!userGuilds) {
      return res.status(401).json({
        success: false,
        error: 'User guilds not found. Please log in again.'
      });
    }

    // Find the specific guild
    const guild = userGuilds.find(g => g.id === guildId);
    
    if (!guild) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this server.'
      });
    }

    // Check permissions
    const permissions = BigInt(guild.permissions || '0');
    const ADMINISTRATOR = BigInt(0x8);
    const MANAGE_GUILD = BigInt(0x20);
    
    const hasAdminPermissions = (permissions & ADMINISTRATOR) === ADMINISTRATOR;
    const hasManagePermissions = (permissions & MANAGE_GUILD) !== BigInt(0) || hasAdminPermissions;

    res.json({
      success: true,
      permissions: {
        hasAdminPermissions,
        hasManagePermissions,
        canManageServer: hasManagePermissions,
        canAccessDashboard: hasManagePermissions
      },
      guild: {
        id: guild.id,
        name: guild.name,
        icon: guild.icon
      }
    });
  } catch (error) {
    logger.errorWithContext(error, {
      context: 'Permission check',
      guildId: req.params?.guildId,
      url: req.url,
      method: req.method
    });
    
    res.status(500).json({
      success: false,
      error: 'Error checking permissions'
    });
  }
});

/**
 * Join Statistics Endpoint
 * Retrieves join statistics for the last 30 days with proper date handling
 * 
 * @route GET /api/stats/joins
 * @param {string} guildId - Discord guild ID (query parameter)
 * @returns {Object} JSON response with daily join statistics for specific guild
 */
app.get('/api/stats/joins', 
  // validateBotPresence(),
  // validateDiscordPermissions('manage'),
  async (req, res) => {
  try {
    const { guildId } = req.query;
    
    if (!guildId) {
      return res.status(400).json({ 
        success: false, 
        error: 'guildId parameter is required' 
      });
    }

    const currentDate = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(currentDate.getDate() - 30);

    // Leer joins de MongoDB para el guild en los últimos 30 días
    const recentJoins = await Join.find({
      guildId: guildId,
      timestamp: { $gte: thirtyDaysAgo, $lte: currentDate }
    }).lean();

    // Si no hay joins, devolver array vacío
    if (!recentJoins.length) {
      return res.json({
        success: true,
        data: [],
        totalJoins: 0,
        guildId: guildId,
        dateRange: {
          start: thirtyDaysAgo.toISOString().split('T')[0],
          end: currentDate.toISOString().split('T')[0]
        }
      });
    }

    // Función helper para obtener la fecha local sin zona horaria
    const getLocalDateString = (date) => {
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Encontrar la fecha del primer join real
    const firstJoinDate = new Date(Math.min(...recentJoins.map(j => new Date(j.timestamp).getTime())));
    const firstDay = new Date(firstJoinDate.getFullYear(), firstJoinDate.getMonth(), firstJoinDate.getDate()); // 00:00 local
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()); // 00:00 local

    // Generar el rango de fechas solo desde el primer join
    const dailyStats = {};
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const dayKey = getLocalDateString(d);
      dailyStats[dayKey] = 0;
    }

    // Contar joins por día usando fecha local
    console.log(`📊 Procesando ${recentJoins.length} joins para estadísticas`);
    recentJoins.forEach(join => {
      const dayKey = getLocalDateString(join.timestamp);
      console.log(`📅 Join de ${join.username} en ${dayKey} (timestamp: ${join.timestamp})`);
      if (dailyStats.hasOwnProperty(dayKey)) {
        dailyStats[dayKey]++;
      }
    });
    
    console.log(`📈 Estadísticas diarias:`, dailyStats);

    // Convertir a formato de gráfico y ordenar
    const chartData = Object.entries(dailyStats)
      .map(([date, count]) => ({ date, joins: count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: chartData,
      totalJoins: recentJoins.length,
      guildId: guildId,
      dateRange: {
        start: getLocalDateString(firstDay),
        end: getLocalDateString(lastDay)
      }
    });
  } catch (error) {
    console.error('❌ Error getting join statistics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/guilds', (req, res) => {
  try {
    const guilds = client.guilds.cache.map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL(),
      memberCount: guild.memberCount,
      owner: guild.ownerId
    }));
    
    res.json({ success: true, guilds });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});



app.get('/api/channels', (req, res) => {
  try {
    // Get channels from the first guild (you can modify this logic)
    const guild = client.guilds.cache.first();
    
    if (!guild) {
      return res.status(404).json({ success: false, error: 'No guilds found' });
    }
    
    const channels = guild.channels.cache
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        position: channel.position,
        parent: channel.parent?.name || null,
        parentId: channel.parentId || null,
        guildName: guild.name
      }))
      .sort((a, b) => a.position - b.position);
    
    res.json({ success: true, channels, guildName: guild.name });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/roles/:guildId', (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ success: false, error: 'Guild not found' });
    }
    const roles = guild.roles.cache
      .filter(role => role.name !== '@everyone')
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position
      }))
      .sort((a, b) => b.position - a.position);
    res.json({ success: true, roles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Welcome Configuration Endpoints
 * Handles saving and retrieving welcome message configurations
 */

// Save welcome configuration
app.post('/api/welcome-config', 
  // validateDiscordPermissions('admin'),
  async (req, res) => {
  console.log('🔔 POST /api/welcome-config recibido');
  // Loguea el tamaño de la imagen base64 si existe
  const { channelId, config } = req.body;
  console.log('Body:', {
    ...req.body,
    config: {
      ...config,
      backgroundImage: config?.backgroundImage ? `[base64] (${config.backgroundImage.length} bytes)` : null
    }
  });

  if (!channelId || !config) {
    console.log('❌ Datos faltantes:', { channelId, config });
    return res.status(400).json({ success: false, error: 'Missing data' });
  }

  // Buscar el guildId al que pertenece el canal
  let foundGuildId = null;
  for (const [guildId, guild] of client.guilds.cache) {
    if (guild.channels.cache.has(channelId)) {
      foundGuildId = guildId;
      break;
    }
  }

  if (!foundGuildId) {
    console.log('❌ Guild no encontrado para el canal:', channelId);
    return res.status(404).json({ success: false, error: 'Guild not found for channel' });
  }

  try {
    // Buscar configuración existente o crear nueva
    let welcomeConfig = await WelcomeConfig.findOne({ serverId: foundGuildId });
    
    if (welcomeConfig) {
      // Actualizar configuración existente
      welcomeConfig.channelId = channelId;
      welcomeConfig.customMessage = config.customMessage || '';
      welcomeConfig.mentionUser = config.mentionUser !== undefined ? config.mentionUser : true;
      welcomeConfig.backgroundImage = {
        url: config.backgroundImage || null,
        color: config.backgroundColor || '#1a1a1a',
        opacity: 1
      };
      welcomeConfig.textConfig = {
        welcomeText: config.welcomeText || 'Welcome',
        usernameText: config.userText || '{user}',
        color: config.textColor || '#ffffff',
        size: config.fontSize || 24,
        usernameSize: Math.floor((config.fontSize || 24) * 0.8)
      };
      welcomeConfig.avatarConfig = {
        show: true,
        size: config.imageSize || 120,
        border: true,
        borderColor: '#7289da',
        borderWidth: 4
      };
      welcomeConfig.enabled = true;
    } else {
      // Crear nueva configuración
      welcomeConfig = new WelcomeConfig({
        serverId: foundGuildId,
        channelId,
        customMessage: config.customMessage || '',
        mentionUser: config.mentionUser !== undefined ? config.mentionUser : true,
        backgroundImage: {
          url: config.backgroundImage || null,
          color: config.backgroundColor || '#1a1a1a',
          opacity: 1
        },
        textConfig: {
          welcomeText: config.welcomeText || 'Welcome',
          usernameText: config.userText || '{user}',
          color: config.textColor || '#ffffff',
          size: config.fontSize || 24,
          usernameSize: Math.floor((config.fontSize || 24) * 0.8)
        },
        avatarConfig: {
          show: true,
          size: config.imageSize || 120,
          border: true,
          borderColor: '#7289da',
          borderWidth: 4
        },
        enabled: true
      });
    }
    
    await welcomeConfig.save();
    console.log('✅ Configuración guardada en MongoDB para guild:', foundGuildId);
    res.json({ success: true, config: welcomeConfig });
  } catch (e) {
    console.error('Error guardando configuración en MongoDB:', e);
    res.status(500).json({ success: false, error: 'Error guardando configuración' });
  }
});

// Get welcome configuration
app.get('/api/welcome-config/:channelId', 
  // validateBotPresence(),
  // validateDiscordPermissions('manage'),
  async (req, res) => {
  try {
    const { channelId } = req.params;
    const welcomeConfig = await WelcomeConfig.findOne({ channelId });
    
    if (!welcomeConfig) {
      return res.status(404).json({ success: false, error: 'No welcome configuration found' });
    }
    
    // Convertir a formato compatible con el frontend
    const config = {
      channelId: welcomeConfig.channelId,
      config: {
        welcomeText: welcomeConfig.textConfig?.welcomeText || 'Welcome',
        userText: welcomeConfig.textConfig?.usernameText || '{user}',
        backgroundColor: welcomeConfig.backgroundImage?.color || '#1a1a1a',
        textColor: welcomeConfig.textConfig?.color || '#ffffff',
        fontSize: welcomeConfig.textConfig?.size || 24,
        imageSize: welcomeConfig.avatarConfig?.size || 120,
        mentionUser: welcomeConfig.mentionUser !== undefined ? welcomeConfig.mentionUser : true,
        customMessage: welcomeConfig.customMessage || '',
        backgroundImage: welcomeConfig.backgroundImage?.url || null
      }
    };
    
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error getting welcome config from MongoDB:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Crear canal en Discord
app.post('/api/channels', 
  // validateDiscordPermissions('admin'),
  async (req, res) => {
  const { name, type, parentId, guildId } = req.body;
  // type: 'text', 'voice', o 'category'
  try {
    if (!guildId) {
      return res.status(400).json({ success: false, error: 'guildId is required' });
    }
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ success: false, error: 'Guild not found' });

    let channelType = 0; // 0 = text, 2 = voice, 4 = category
    if (type === 'voice') channelType = 2;
    else if (type === 'category') channelType = 4;

    let options = {
      name,
      type: channelType,
      reason: 'Creado desde el panel Syro'
    };
    if (parentId && channelType !== 4) {
      options.parent = parentId;
    }

    // discord.js v14: guild.channels.create({ ... })
    const newChannel = await guild.channels.create(options);

    res.json({
      success: true,
      channel: {
        id: newChannel.id,
        name: newChannel.name,
        type: newChannel.type,
        parentId: newChannel.parentId || null
      }
    });
  } catch (error) {
    console.error('Error creando canal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Template routes
app.post('/api/templates', sanitizeAll(), sanitizeUrls(['discord.com', 'discord.new']), async (req, res) => {
  try {
    const { name, tags, link, icon, userId, username } = req.body;

    if (!userId || !username) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // Validar que todos los campos estén completos
    if (!name || !tags || !link) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Validar que el link sea un template válido de Discord
    const templateRegex = /^https:\/\/(discord\.com\/template\/[a-zA-Z0-9]+|discord\.new\/[a-zA-Z0-9]+)/;
    if (!templateRegex.test(link)) {
      return res.status(400).json({ error: 'El link debe ser un template válido de Discord' });
    }

    const template = new Template({
      name,
      tags,
      link,
      icon,
      submittedBy: { userId, username }
    });

    await template.save();
    res.status(201).json({ message: 'Template enviado para revisión', template });
  } catch (error) {
    console.error('Error al crear template:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener templates pendientes (solo para el owner)
app.post('/api/templates/pending', sanitizeAll(), async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Verificar que sea el owner
    if (userId !== '590275518599921701') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const pendingTemplates = await Template.find({ status: 'pending' })
      .sort({ createdAt: -1 });

    res.json({ templates: pendingTemplates });
  } catch (error) {
    console.error('Error al obtener templates pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener templates aprobados (público)
app.get('/api/templates/approved', sanitizeAll(), async (req, res) => {
  try {
    const approvedTemplates = await Template.find({ status: 'approved' })
      .sort({ reviewedAt: -1 });

    res.json({ templates: approvedTemplates });
  } catch (error) {
    console.error('Error al obtener templates aprobados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Aprobar template
app.post('/api/templates/:id/approve', sanitizeAll(), async (req, res) => {
  try {
    const { userId, username } = req.body;
    
    // Verificar que sea el owner
    if (userId !== '590275518599921701') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template no encontrado' });
    }

    template.status = 'approved';
    template.reviewedBy = { userId, username };
    template.reviewedAt = new Date();
    await template.save();

    res.json({ message: 'Template aprobado', template });
  } catch (error) {
    console.error('Error al aprobar template:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Rechazar template
app.post('/api/templates/:id/reject', sanitizeAll(), async (req, res) => {
  try {
    const { userId, username } = req.body;
    
    // Verificar que sea el owner
    if (userId !== '590275518599921701') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template no encontrado' });
    }

    template.status = 'rejected';
    template.reviewedBy = { userId, username };
    template.reviewedAt = new Date();
    await template.save();

    res.json({ message: 'Template rechazado', template });
  } catch (error) {
    console.error('Error al rechazar template:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Join Roles Configuration Endpoints
 * Handles saving and retrieving join roles configuration
 */

// Get join roles configuration
app.get('/api/join-roles/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    console.log(`🔍 Getting join roles config for guild: ${guildId}`);
    
    // Find existing server configuration
    let serverConfig = await ServerConfig.findOne({ serverId: guildId });
    
    if (!serverConfig) {
      console.log(`📝 Creating default join roles config for guild: ${guildId}`);
      // Create default configuration if none exists
      serverConfig = new ServerConfig({
        serverId: guildId,
        joinRoles: {
          general: [],
          user: [],
          bot: []
        }
      });
      await serverConfig.save();
      console.log(`✅ Join roles config created for guild: ${guildId}`);
    } else {
      console.log(`✅ Join roles config found for guild: ${guildId}`);
    }
    
    res.json({
      success: true,
      joinRoles: serverConfig.joinRoles || { general: [], user: [], bot: [] }
    });
  } catch (error) {
    console.error('❌ Error getting join roles config:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Save join roles configuration
app.put('/api/join-roles/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { joinRoles } = req.body;

    console.log('🔍 Saving join roles config for guild:', guildId);
    console.log('📋 Join roles data:', JSON.stringify(joinRoles, null, 2));

    // Find or create server configuration
    let serverConfig = await ServerConfig.findOne({ serverId: guildId });

    if (!serverConfig) {
      serverConfig = new ServerConfig({ serverId: guildId });
    }

    // Update join roles configuration
    serverConfig.joinRoles = joinRoles;
    serverConfig.updatedAt = new Date();

    await serverConfig.save();

    console.log('✅ Join roles config saved successfully');

    res.json({
      success: true,
      message: 'Join roles configuration updated successfully'
    });
  } catch (error) {
    console.error('❌ Error saving join roles config:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Real-time Logs Endpoints
 * Handles retrieving logs for the dashboard
 */

const LogManager = require('./utils/logManager');

// Get recent logs for a guild
app.get('/api/logs/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { limit = 30, type } = req.query;
    
    console.log(`🔍 Getting logs for guild: ${guildId}, limit: ${limit}, type: ${type || 'all'}`);
    
    let logs;
    if (type) {
      logs = await LogManager.getLogsByType(guildId, type, parseInt(limit));
    } else {
      logs = await LogManager.getRecentLogs(guildId, parseInt(limit));
    }
    
    console.log(`✅ Retrieved ${logs.length} logs for guild: ${guildId}`);
    
    res.json({
      success: true,
      logs: logs
    });
  } catch (error) {
    console.error('❌ Error getting logs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get logs by type for a guild
app.get('/api/logs/:guildId/:type', async (req, res) => {
  try {
    const { guildId, type } = req.params;
    const { limit = 30 } = req.query;
    
    console.log(`🔍 Getting logs for guild: ${guildId}, type: ${type}, limit: ${limit}`);
    
    const logs = await LogManager.getLogsByType(guildId, type, parseInt(limit));
    
    console.log(`✅ Retrieved ${logs.length} ${type} logs for guild: ${guildId}`);
    
    res.json({
      success: true,
      logs: logs
    });
  } catch (error) {
    console.error('❌ Error getting logs by type:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Something broke!' });
});

// Start server
const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
});

// Evento ready con logs
client.once('ready', () => {
  console.log(`🤖 Bot logged in as ${client.user.tag}`);
  console.log(`📊 Serviendo ${client.guilds.cache.size} servidores`);
  console.log(`👥 Total de usuarios: ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)}`);
  
  // Log de cada servidor
  client.guilds.cache.forEach(guild => {
    console.log(`  - ${guild.name}: ${guild.memberCount} miembros`);
  });
});

// Login del bot
client.login(process.env.DISCORD_TOKEN);

// Export client for use in index.js
module.exports = { client, welcomeConfigs }; 