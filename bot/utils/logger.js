/**
 * Secure Logging System
 * 
 * This module provides secure logging functionality that prevents
 * exposure of sensitive information like tokens, session IDs, etc.
 * 
 * @author Syro Development Team
 * @version 1.0.0
 */

const winston = require('winston');
const path = require('path');

/**
 * Sensitive data patterns to redact from logs
 */
const SENSITIVE_PATTERNS = [
  /token["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /session["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /password["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /secret["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /client_secret["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /access_token["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /refresh_token["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /api_key["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /private_key["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /discord_token["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /mongodb_uri["\s]*[:=]["\s]*[^"\s,}]+/gi
];

/**
 * Redact sensitive information from log messages
 * @param {string} message - The log message to sanitize
 * @returns {string} - Sanitized message
 */
function sanitizeMessage(message) {
  let sanitized = message;
  
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, (match) => {
      const key = match.split(/[:=]/)[0].trim();
      return `${key}: [REDACTED]`;
    });
  });
  
  return sanitized;
}

/**
 * Custom format for secure logging
 */
const secureFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const sanitizedMessage = sanitizeMessage(message);
  const sanitizedMeta = {};
  
  // Sanitize meta data
  Object.keys(meta).forEach(key => {
    if (typeof meta[key] === 'string') {
      sanitizedMeta[key] = sanitizeMessage(meta[key]);
    } else {
      sanitizedMeta[key] = meta[key];
    }
  });
  
  const metaString = Object.keys(sanitizedMeta).length > 0 
    ? ` ${JSON.stringify(sanitizedMeta)}` 
    : '';
    
  return `${timestamp} [${level.toUpperCase()}]: ${sanitizedMessage}${metaString}`;
});

/**
 * Create logs directory if it doesn't exist
 */
const logsDir = path.join(__dirname, '..', 'logs');
const fs = require('fs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Winston logger configuration
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    secureFormat
  ),
  defaultMeta: { service: 'syro-bot' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        secureFormat
      )
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // File transport for error logs only
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // File transport for security events
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      tailable: true
    })
  ]
});

/**
 * Security logging methods
 */
logger.security = (message, meta = {}) => {
  logger.warn(`🔒 SECURITY: ${message}`, { ...meta, type: 'security' });
};

logger.auth = (message, meta = {}) => {
  logger.info(`🔑 AUTH: ${message}`, { ...meta, type: 'authentication' });
};

logger.api = (message, meta = {}) => {
  logger.info(`🌐 API: ${message}`, { ...meta, type: 'api' });
};

logger.bot = (message, meta = {}) => {
  logger.info(`🤖 BOT: ${message}`, { ...meta, type: 'bot' });
};

logger.database = (message, meta = {}) => {
  logger.info(`💾 DB: ${message}`, { ...meta, type: 'database' });
};

/**
 * Rate limiting logging
 */
logger.rateLimit = (ip, endpoint, meta = {}) => {
  logger.security(`Rate limit exceeded for IP ${ip} on endpoint ${endpoint}`, {
    ip,
    endpoint,
    ...meta
  });
};

/**
 * Error logging with context
 */
logger.errorWithContext = (error, context = {}) => {
  logger.error(`Error: ${error.message}`, {
    stack: error.stack,
    context,
    type: 'error'
  });
};

module.exports = logger; 