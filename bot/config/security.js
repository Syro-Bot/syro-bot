/**
 * Security Configuration Module
 * 
 * Centralizes all security settings, headers, and configurations
 * for the Syro Discord bot API server.
 * 
 * @author Syro Development Team
 * @version 2.0.0
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const logger = require('../utils/logger');

/**
 * Security Headers Configuration
 * Comprehensive security headers using helmet.js
 */
const SECURITY_HEADERS = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://discord.com", "https://cdn.discordapp.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  ieNoOpen: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' }
};

/**
 * Compression Configuration
 * Optimize response sizes for better performance
 */
const COMPRESSION_CONFIG = {
  level: 6, // Balance between compression and CPU usage
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression for all other requests
    return compression.filter(req, res);
  }
};

/**
 * Rate Limiting Configurations
 * Different rate limits for different types of endpoints
 */
const RATE_LIMITS = {
  // General API rate limit
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.rateLimit(req.ip, req.url);
      res.status(429).json({
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(15 * 60 / 60) // 15 minutes in minutes
      });
    }
  }),

  // Strict rate limit for authentication
  auth: rateLimit({
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
  }),

  // File upload rate limit
  upload: rateLimit({
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
  }),

  // API endpoints rate limit
  api: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per minute
    message: {
      success: false,
      error: 'Too many API requests from this IP, please try again later.'
    },
    handler: (req, res) => {
      logger.rateLimit(req.ip, 'api');
      res.status(429).json({
        success: false,
        error: 'Too many API requests from this IP, please try again later.'
      });
    }
  }),

  // User-specific rate limit (for authenticated users)
  user: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each user to 200 requests per 15 minutes
    keyGenerator: (req) => req.session?.userId || req.ip,
    message: {
      success: false,
      error: 'Too many requests from this user, please try again later.'
    },
    handler: (req, res) => {
      logger.rateLimit(req.session?.userId || req.ip, 'user');
      res.status(429).json({
        success: false,
        error: 'Too many requests from this user, please try again later.'
      });
    }
  })
};

/**
 * File Upload Security Configuration
 * Enhanced security settings for file uploads
 */
const FILE_UPLOAD_SECURITY = {
  allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(','),
  maxSize: parseInt(process.env.MAX_FILE_SIZE) || 26214400, // 25MB default
  maxFiles: 1,
  fileFilter: (req, file, cb) => {
    // Additional file type validation
    if (!FILE_UPLOAD_SECURITY.allowedTypes.includes(file.mimetype)) {
      logger.security('Invalid file type attempted', {
        mimetype: file.mimetype,
        originalname: file.originalname,
        ip: req.ip
      });
      return cb(new Error('Invalid file type'), false);
    }
    
    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      logger.security('Invalid file extension attempted', {
        extension: fileExtension,
        originalname: file.originalname,
        ip: req.ip
      });
      return cb(new Error('Invalid file extension'), false);
    }
    
    cb(null, true);
  }
};

/**
 * Session Security Configuration
 * Enhanced session settings for better security
 */
const SESSION_SECURITY = {
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true, // obligatorio en producción HTTPS
    sameSite: 'none', // para cross-site cookies
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    domain: undefined, // solo para syro-backend.onrender.com
    path: '/'
  },
  name: 'syro.sid', // Custom session name
  rolling: true, // Extend session on activity
  unset: 'destroy' // Remove session from store when unset
};

/**
 * CORS Configuration
 * Enhanced CORS settings for security
 */
const allowedOrigins = [
  'https://syro-web.vercel.app',
  'https://syro-web-rnp.vercel.app',
  'https://syro-ql8b2dqf5-rnp.vercel.app',
  'http://localhost:5173'
];

const CORS_CONFIG = {
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie', 'X-Total-Count'], // <-- Añadido 'Set-Cookie'
  maxAge: 86400 // 24 hours
};

/**
 * Environment Validation
 * Validates required environment variables for security
 */
function validateEnvironment() {
  const requiredVars = [
    'DISCORD_TOKEN',
    'DISCORD_CLIENT_ID',
    'MONGODB_URI'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error('Missing required environment variables', { missingVars });
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate session secret strength
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    logger.warn('Session secret is too short. Consider using a longer secret for production.');
  }

  logger.security('Environment validation passed');
}

/**
 * Get security middleware stack
 * @returns {Array} - Array of security middleware functions
 */
function getSecurityMiddleware() {
  return [
    helmet(SECURITY_HEADERS),
    compression(COMPRESSION_CONFIG),
    RATE_LIMITS.general,
    // Additional security middleware can be added here
  ];
}

module.exports = {
  SECURITY_HEADERS,
  COMPRESSION_CONFIG,
  RATE_LIMITS,
  FILE_UPLOAD_SECURITY,
  SESSION_SECURITY,
  CORS_CONFIG,
  validateEnvironment,
  getSecurityMiddleware
}; 