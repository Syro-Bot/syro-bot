/**
 * Application Configuration Module
 * 
 * Centralizes Express application setup, middleware configuration,
 * and server initialization for the Syro Discord bot.
 * 
 * @author Syro Development Team
 * @version 2.0.0
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const logger = require('../utils/logger');
const { validateEnvironment, getSecurityMiddleware, CORS_CONFIG, SESSION_SECURITY } = require('./security');
const { initializeDatabase } = require('./database');

/**
 * Create and configure Express application
 * @param {Object} discordClient - Discord.js client instance
 * @returns {express.Application} - Configured Express application
 */
function createApp(discordClient) {
  try {
    // Validate environment before creating app
    validateEnvironment();

    const app = express();

    // Make Discord client available to middleware and routes
    app.set('discordClient', discordClient);
    app.locals.client = discordClient;

    // Security middleware
    const securityMiddleware = getSecurityMiddleware();
    securityMiddleware.forEach(middleware => app.use(middleware));

    // CORS configuration
    app.use(cors(CORS_CONFIG));

    // Body parser middleware with enhanced limits
    app.use(bodyParser.json({ 
      limit: '25mb',
      verify: (req, res, buf) => {
        // Store raw body for potential signature verification
        req.rawBody = buf;
      }
    }));
    app.use(bodyParser.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));

    // Session configuration
    app.use(session(SESSION_SECURITY));

    // Static file serving with security headers
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    app.use('/uploads', express.static(uploadsDir, {
      setHeaders: (res, path) => {
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
      }
    }));

    // Request logging middleware
    app.use((req, res, next) => {
      logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      next();
    });

    // Global error handler
    app.use((err, req, res, next) => {
      logger.errorWithContext(err, {
        url: req.url,
        method: req.method,
        body: req.body,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });

    logger.info('Express application configured successfully');
    return app;
  } catch (error) {
    logger.errorWithContext(error, { context: 'Application creation' });
    throw error;
  }
}

/**
 * Initialize application with database connection
 * @param {Object} discordClient - Discord.js client instance
 * @returns {Promise<express.Application>} - Initialized Express application
 */
async function initializeApp(discordClient) {
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Create and configure Express app
    const app = createApp(discordClient);
    
    logger.info('Application initialized successfully');
    return app;
  } catch (error) {
    logger.errorWithContext(error, { context: 'Application initialization' });
    throw error;
  }
}

/**
 * Graceful shutdown handler
 * @param {express.Application} app - Express application
 * @param {Object} server - HTTP server instance
 * @param {Object} discordClient - Discord.js client instance
 */
function setupGracefulShutdown(app, server, discordClient) {
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        // Close Discord client
        if (discordClient && discordClient.destroy) {
          discordClient.destroy();
          logger.info('Discord client destroyed');
        }
        
        // Close database connection
        const { closeDatabase } = require('./database');
        await closeDatabase();
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.errorWithContext(error, { context: 'Graceful shutdown' });
        process.exit(1);
      }
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  // Handle different shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.errorWithContext(error, { context: 'Uncaught exception' });
    shutdown('uncaughtException');
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.errorWithContext(reason, { 
      context: 'Unhandled promise rejection',
      promise: promise.toString()
    });
    shutdown('unhandledRejection');
  });
}

module.exports = {
  createApp,
  initializeApp,
  setupGracefulShutdown
}; 