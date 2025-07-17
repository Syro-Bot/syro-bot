/**
 * Syro Web Dashboard API Server - REFACTORED VERSION
 * 
 * This is the main Express.js server that provides the REST API for the Syro web dashboard.
 * It has been refactored for better security, modularity, and maintainability.
 * 
 * Features:
 * - Modular architecture with separate configuration modules
 * - Enhanced security with helmet.js and comprehensive validation
 * - Improved database connection with connection pooling
 * - Better error handling and logging
 * - Graceful shutdown handling
 * - Comprehensive health checks and monitoring
 * - Redis caching for improved performance
 * - Advanced rate limiting with Redis
 * 
 * @author Syro Development Team
 * @version 2.0.0 - REFACTORED
 */

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('./utils/logger');

// Import modular configuration
const { initializeApp, setupGracefulShutdown } = require('./config/app');
const { cacheManager, rateLimiter } = require('./config/redis');

/**
 * Discord Client Configuration
 * Enhanced intents for better functionality
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

/**
 * Main application startup function
 */
async function startServer() {
  try {
    logger.info('🚀 Starting Syro Web Dashboard API Server...');
    
    // Initialize Express application with database connection
    const app = await initializeApp(client);
    
    // Add cache and rate limiting middleware
    app.use(async (req, res, next) => {
      // Add cache manager to request object
      req.cache = cacheManager;
      req.rateLimiter = rateLimiter;
      next();
    });
    
    // Import and register route modules
    const healthRoutes = require('./routes/health');
    const uploadRoutes = require('./routes/upload');
    const automodRoutes = require('./routes/automod');
    const channelsRoutes = require('./routes/channels');
    const nukeRoutes = require('./routes/nuke');
    const announcementRoutes = require('./routes/announcement');
    const globalAnnouncementRoutes = require('./routes/global-announcement');
    const announcementConfigRoutes = require('./routes/announcement-config');
    const memberCountRoutes = require('./routes/member-count');
    const dataRetentionRoutes = require('./routes/data-retention');
    const authRoutes = require('./routes/auth'); // <-- Agrego rutas de autenticación
    const devDummyRoutes = require('./routes/dev-dummy'); // <-- Agrego rutas dummy para desarrollo
    
    // Register API routes
    app.use('/api', healthRoutes);
    app.use('/api', uploadRoutes);
    app.use('/api', automodRoutes);
    app.use('/api/channels', channelsRoutes);
    app.use('/api/nuke', nukeRoutes);
    app.use('/api/announcement', announcementRoutes);
    app.use('/api/global-announcement', globalAnnouncementRoutes);
    app.use('/api/announcement-config', announcementConfigRoutes);
    app.use('/api/member-count', memberCountRoutes);
    app.use('/api/guild', dataRetentionRoutes);
    app.use('/', authRoutes); // <-- Registro rutas de auth en la raíz para exponer /callback
    app.use('/api', devDummyRoutes); // <-- Registro rutas reales bajo /api
    
    // Legacy routes (to be migrated to modules)
    registerLegacyRoutes(app);
    
    // Start HTTP server
    const PORT = process.env.API_PORT || 3001;
    const server = app.listen(PORT, () => {
      logger.info(`🚀 API Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`⚡ Redis caching enabled`);
      logger.info(`🛡️ Advanced rate limiting enabled`);
    });
    
    // Setup graceful shutdown
    setupGracefulShutdown(app, server, client);
    
    // Start Discord bot
    await startDiscordBot();
    
  } catch (error) {
    logger.errorWithContext(error, { context: 'Server startup' });
    process.exit(1);
  }
}

/**
 * Start Discord bot with enhanced logging
 */
async function startDiscordBot() {
  try {
    // Initialize bot event handlers
    const { initializeBotHandlers } = require('./handlers/botHandler');
    initializeBotHandlers(client);
    
    // Login to Discord
    await client.login(process.env.DISCORD_TOKEN);
    logger.info('🔐 Discord bot authentication successful');
    
  } catch (error) {
    logger.errorWithContext(error, { context: 'Discord bot startup' });
    throw error;
  }
}

/**
 * Register legacy routes (to be migrated to modules)
 * These routes will be moved to separate modules in future updates
 */
function registerLegacyRoutes(app) {
  const { validateDiscordPermissions, validateBotPresence } = require('./middleware/auth');
  const { sanitizeAll, sanitizeUrls } = require('./middleware/sanitizer');
  const Join = require('./models/Join');
  const Template = require('./models/Template');
  const ServerConfig = require('./models/ServerConfig');
  const WelcomeConfig = require('./models/WelcomeConfig');
  const LogManager = require('./utils/logManager');
  
  // Session debug endpoint
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
  
  // Bot invite endpoint
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
  
  // Permission check endpoint
  app.get('/api/permissions/:guildId', 
    validateBotPresence(),
    async (req, res) => {
    try {
      const { guildId } = req.params;
      const userGuilds = req.session?.userGuilds;
      
      if (!userGuilds) {
        return res.status(401).json({
          success: false,
          error: 'User guilds not found. Please log in again.'
        });
      }

      const guild = userGuilds.find(g => g.id === guildId);
      
      if (!guild) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this server.'
        });
      }

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
  
  // Join statistics endpoint
  app.get('/api/stats/joins', async (req, res) => {
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

      const recentJoins = await Join.find({
        guildId: guildId,
        timestamp: { $gte: thirtyDaysAgo, $lte: currentDate }
      }).lean();

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

      // Cambiar a agrupación por día UTC
      const getUTCDateString = (date) => {
        const d = new Date(date);
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      };

      const firstJoinDate = new Date(Math.min(...recentJoins.map(j => new Date(j.timestamp).getTime())));
      const firstDay = new Date(Date.UTC(firstJoinDate.getUTCFullYear(), firstJoinDate.getUTCMonth(), firstJoinDate.getUTCDate()));
      const lastDay = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate()));

      const dailyStats = {};
      for (let d = new Date(firstDay); d <= lastDay; d.setUTCDate(d.getUTCDate() + 1)) {
        const dayKey = getUTCDateString(d);
        dailyStats[dayKey] = 0;
      }

      recentJoins.forEach(join => {
        const dayKey = getUTCDateString(join.timestamp);
        if (dailyStats.hasOwnProperty(dayKey)) {
          dailyStats[dayKey]++;
        }
      });

      const chartData = Object.entries(dailyStats)
        .map(([date, count]) => ({ date, joins: count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      res.json({
        success: true,
        data: chartData,
        totalJoins: recentJoins.length,
        guildId: guildId,
        dateRange: {
          start: getUTCDateString(firstDay),
          end: getUTCDateString(lastDay)
        }
      });
    } catch (error) {
      logger.errorWithContext(error, { context: 'Join statistics' });
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Guilds endpoint
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
  
  // Channels endpoint
  app.get('/api/channels', (req, res) => {
    try {
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
  
  // Roles endpoint
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
  
  // Welcome configuration endpoints
  app.post('/api/welcome-config', async (req, res) => {
    try {
      const { channelId, config } = req.body;

      if (!channelId || !config) {
        return res.status(400).json({ success: false, error: 'Missing data' });
      }

      let foundGuildId = null;
      for (const [guildId, guild] of client.guilds.cache) {
        if (guild.channels.cache.has(channelId)) {
          foundGuildId = guildId;
          break;
        }
      }

      if (!foundGuildId) {
        return res.status(404).json({ success: false, error: 'Guild not found for channel' });
      }

      let welcomeConfig = await WelcomeConfig.findOne({ serverId: foundGuildId });
      
      if (welcomeConfig) {
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
      res.json({ success: true, config: welcomeConfig });
    } catch (error) {
      logger.errorWithContext(error, { context: 'Welcome config save' });
      res.status(500).json({ success: false, error: 'Error saving configuration' });
    }
  });
  
  app.get('/api/welcome-config/:channelId', async (req, res) => {
    try {
      const { channelId } = req.params;
      const welcomeConfig = await WelcomeConfig.findOne({ channelId });
      
      if (!welcomeConfig) {
        return res.status(404).json({ success: false, error: 'No welcome configuration found' });
      }
      
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
      logger.errorWithContext(error, { context: 'Welcome config get' });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
  
  // Channel creation endpoint
  app.post('/api/channels', async (req, res) => {
    try {
      const { name, type, parentId, guildId } = req.body;
      
      if (!guildId) {
        return res.status(400).json({ success: false, error: 'guildId is required' });
      }
      
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ success: false, error: 'Guild not found' });

      let channelType = 0;
      if (type === 'voice') channelType = 2;
      else if (type === 'category') channelType = 4;

      let options = {
        name,
        type: channelType,
        reason: 'Created from Syro panel'
      };
      if (parentId && channelType !== 4) {
        options.parent = parentId;
      }

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
      logger.errorWithContext(error, { context: 'Channel creation' });
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Template routes
  app.post('/api/templates', sanitizeAll(), sanitizeUrls(['discord.com', 'discord.new']), async (req, res) => {
    try {
      const { name, tags, link, icon, userId, username } = req.body;

      if (!userId || !username) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!name || !tags || !link) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const templateRegex = /^https:\/\/(discord\.com\/template\/[a-zA-Z0-9]+|discord\.new\/[a-zA-Z0-9]+)/;
      if (!templateRegex.test(link)) {
        return res.status(400).json({ error: 'The link must be a valid Discord template' });
      }

      const template = new Template({
        name,
        tags,
        link,
        icon,
        submittedBy: { userId, username }
      });

      await template.save();
      res.status(201).json({ message: 'Template submitted for review', template });
    } catch (error) {
      logger.errorWithContext(error, { context: 'Template creation' });
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.post('/api/templates/pending', sanitizeAll(), async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (userId !== '590275518599921701') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const pendingTemplates = await Template.find({ status: 'pending' })
        .sort({ createdAt: -1 });

      res.json({ templates: pendingTemplates });
    } catch (error) {
      logger.errorWithContext(error, { context: 'Pending templates' });
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.get('/api/templates/approved', sanitizeAll(), async (req, res) => {
    try {
      const approvedTemplates = await Template.find({ status: 'approved' })
        .sort({ reviewedAt: -1 });

      res.json({ templates: approvedTemplates });
    } catch (error) {
      logger.errorWithContext(error, { context: 'Approved templates' });
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.post('/api/templates/:id/approve', sanitizeAll(), async (req, res) => {
    try {
      const { userId, username } = req.body;
      
      if (userId !== '590275518599921701') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const template = await Template.findById(req.params.id);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      template.status = 'approved';
      template.reviewedBy = { userId, username };
      template.reviewedAt = new Date();
      await template.save();

      res.json({ message: 'Template approved', template });
    } catch (error) {
      logger.errorWithContext(error, { context: 'Template approval' });
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.post('/api/templates/:id/reject', sanitizeAll(), async (req, res) => {
    try {
      const { userId, username } = req.body;
      
      if (userId !== '590275518599921701') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const template = await Template.findById(req.params.id);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      template.status = 'rejected';
      template.reviewedBy = { userId, username };
      template.reviewedAt = new Date();
      await template.save();

      res.json({ message: 'Template rejected', template });
    } catch (error) {
      logger.errorWithContext(error, { context: 'Template rejection' });
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Join roles configuration endpoints
  app.get('/api/join-roles/:guildId', async (req, res) => {
    try {
      const { guildId } = req.params;
      
      let serverConfig = await ServerConfig.findOne({ serverId: guildId });
      
      if (!serverConfig) {
        serverConfig = new ServerConfig({
          serverId: guildId,
          joinRoles: {
            general: [],
            user: [],
            bot: []
          }
        });
        await serverConfig.save();
      }
      
      res.json({
        success: true,
        joinRoles: serverConfig.joinRoles || { general: [], user: [], bot: [] }
      });
    } catch (error) {
      logger.errorWithContext(error, { context: 'Join roles get' });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });
  
  app.put('/api/join-roles/:guildId', async (req, res) => {
    try {
      const { guildId } = req.params;
      const { joinRoles } = req.body;

      let serverConfig = await ServerConfig.findOne({ serverId: guildId });

      if (!serverConfig) {
        serverConfig = new ServerConfig({ serverId: guildId });
      }

      serverConfig.joinRoles = joinRoles;
      serverConfig.updatedAt = new Date();

      await serverConfig.save();

      res.json({
        success: true,
        message: 'Join roles configuration updated successfully'
      });
    } catch (error) {
      logger.errorWithContext(error, { context: 'Join roles save' });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });
  
  // Logs endpoints
  app.get('/api/logs/:guildId', async (req, res) => {
    try {
      const { guildId } = req.params;
      const { limit = 30, type } = req.query;
      
      let logs;
      if (type) {
        logs = await LogManager.getLogsByType(guildId, type, parseInt(limit));
      } else {
        logs = await LogManager.getRecentLogs(guildId, parseInt(limit));
      }
      
      res.json({
        success: true,
        logs: logs
      });
    } catch (error) {
      logger.errorWithContext(error, { context: 'Logs get' });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });
  
  app.get('/api/logs/:guildId/:type', async (req, res) => {
    try {
      const { guildId, type } = req.params;
      const { limit = 30 } = req.query;
      
      const logs = await LogManager.getLogsByType(guildId, type, parseInt(limit));
      
      res.json({
        success: true,
        logs: logs
      });
    } catch (error) {
      logger.errorWithContext(error, { context: 'Logs by type' });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Ruta de test para setear varias cookies de prueba
  app.get('/test-cookie', (req, res) => {
    res.cookie('testcookie_default', '123', {
      httpOnly: true,
      path: '/',
      maxAge: 24 * 60 * 60 * 1000
    });
    res.cookie('testcookie_lax', '456', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000
    });
    res.cookie('testcookie_none', '789', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000
    });
    res.send('Multiple test cookies set');
  });
}

// Start the server
startServer().catch(error => {
  logger.errorWithContext(error, { context: 'Server startup failure' });
  process.exit(1);
});

// Export for testing
module.exports = { client }; 