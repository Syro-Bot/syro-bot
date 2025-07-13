/**
 * Sanitization Middleware - SECURE VERSION
 * 
 * This middleware automatically sanitizes incoming request data
 * to prevent XSS, injection attacks, and data corruption.
 * 
 * @author Syro Development Team
 * @version 2.0.0 - SECURE
 */

const {
  sanitizeText,
  sanitizeUrl,
  sanitizeJsonObject,
  sanitizeAutomodRule,
  sanitizeTemplate,
  sanitizeDiscordContent
} = require('../utils/sanitizer');
const logger = require('../utils/logger');

// Maximum request sizes to prevent DoS
const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB
const MAX_FIELD_SIZE = 64 * 1024; // 64KB
const MAX_ARRAY_LENGTH = 1000;
const MAX_OBJECT_KEYS = 100;

/**
 * Validate request size to prevent DoS attacks
 * @param {Object} req - Express request object
 * @returns {boolean} - True if request size is acceptable
 */
function validateRequestSize(req) {
  try {
    const bodySize = JSON.stringify(req.body || {}).length;
    const querySize = JSON.stringify(req.query || {}).length;
    const paramsSize = JSON.stringify(req.params || {}).length;
    
    const totalSize = bodySize + querySize + paramsSize;
    
    if (totalSize > MAX_REQUEST_SIZE) {
      logger.security('Request size exceeded limit', {
        url: req.url,
        method: req.method,
        totalSize,
        maxSize: MAX_REQUEST_SIZE,
        ip: req.ip
      });
      return false;
    }
    
    return true;
  } catch (error) {
    logger.errorWithContext(error, { context: 'Request size validation' });
    return false;
  }
}

/**
 * Sanitize filename to prevent path traversal
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'unknown';
  }
  
  // Remove path traversal characters
  let sanitized = filename
    .replace(/\.\./g, '') // Remove ../
    .replace(/[\/\\]/g, '_') // Replace slashes with underscores
    .replace(/[^\w\-\.]/g, '_') // Only allow alphanumeric, hyphens, dots
    .substring(0, 255); // Limit length
  
  // Ensure it has an extension
  if (!sanitized.includes('.')) {
    sanitized += '.txt';
  }
  
  return sanitized || 'unknown.txt';
}

/**
 * Deep sanitize object recursively
 * @param {any} data - Data to sanitize
 * @param {number} depth - Current recursion depth
 * @returns {any} - Sanitized data
 */
function deepSanitize(data, depth = 0) {
  // Prevent infinite recursion
  if (depth > 10) {
    logger.security('Maximum sanitization depth exceeded', { depth });
    return null;
  }
  
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'string') {
    return sanitizeText(data);
  }
  
  if (typeof data === 'number') {
    // Validate number range
    if (!isFinite(data) || data > Number.MAX_SAFE_INTEGER || data < Number.MIN_SAFE_INTEGER) {
      return 0;
    }
    return data;
  }
  
  if (typeof data === 'boolean') {
    return data;
  }
  
  if (Array.isArray(data)) {
    // Limit array length
    if (data.length > MAX_ARRAY_LENGTH) {
      logger.security('Array length exceeded limit', { 
        length: data.length, 
        maxLength: MAX_ARRAY_LENGTH 
      });
      return data.slice(0, MAX_ARRAY_LENGTH);
    }
    
    return data.map(item => deepSanitize(item, depth + 1));
  }
  
  if (typeof data === 'object') {
    const sanitized = {};
    const keys = Object.keys(data);
    
    // Limit object keys
    if (keys.length > MAX_OBJECT_KEYS) {
      logger.security('Object keys exceeded limit', { 
        keys: keys.length, 
        maxKeys: MAX_OBJECT_KEYS 
      });
      keys.splice(MAX_OBJECT_KEYS);
    }
    
    for (const key of keys) {
      // Sanitize key name
      const sanitizedKey = sanitizeText(key).substring(0, 100);
      if (sanitizedKey) {
        sanitized[sanitizedKey] = deepSanitize(data[key], depth + 1);
      }
    }
    
    return sanitized;
  }
  
  return null;
}

/**
 * Secure general sanitization middleware
 * Sanitizes all incoming request data with size validation
 * 
 * @returns {Function} - Express middleware function
 */
function sanitizeAll() {
  return (req, res, next) => {
    try {
      // Validate request size first
      if (!validateRequestSize(req)) {
        return res.status(413).json({
          success: false,
          error: 'Request too large'
        });
      }

      // Sanitize query parameters
      if (req.query) {
        req.query = deepSanitize(req.query);
      }

      // Sanitize body parameters
      if (req.body) {
        req.body = deepSanitize(req.body);
      }

      // Sanitize URL parameters
      if (req.params) {
        req.params = deepSanitize(req.params);
      }

      logger.security('Request data sanitized securely', {
        url: req.url,
        method: req.method,
        hasQuery: !!req.query,
        hasBody: !!req.body,
        hasParams: !!req.params,
        ip: req.ip
      });

      next();
    } catch (error) {
      logger.errorWithContext(error, { 
        context: 'General sanitization',
        url: req.url,
        method: req.method,
        ip: req.ip
      });
      
      res.status(400).json({
        success: false,
        error: 'Invalid request data'
      });
    }
  };
}

/**
 * Secure automod rule sanitization middleware
 * Specifically sanitizes automod rule data with validation
 * 
 * @returns {Function} - Express middleware function
 */
function sanitizeAutomodRules() {
  return (req, res, next) => {
    try {
      if (req.body && req.body.automodRules) {
        const originalRules = JSON.stringify(req.body.automodRules);
        
        // Validate automod rules structure
        if (typeof req.body.automodRules !== 'object') {
          logger.security('Invalid automod rules structure', {
            url: req.url,
            method: req.method,
            type: typeof req.body.automodRules
          });
          return res.status(400).json({
            success: false,
            error: 'Invalid automod rules format'
          });
        }
        
        // Sanitize each rule category
        Object.keys(req.body.automodRules).forEach(category => {
          if (Array.isArray(req.body.automodRules[category])) {
            // Limit array length
            if (req.body.automodRules[category].length > MAX_ARRAY_LENGTH) {
              req.body.automodRules[category] = req.body.automodRules[category].slice(0, MAX_ARRAY_LENGTH);
            }
            
            req.body.automodRules[category] = req.body.automodRules[category].map(rule => 
              sanitizeAutomodRule(rule)
            );
          }
        });

        const sanitizedRules = JSON.stringify(req.body.automodRules);
        
        logger.security('Automod rules sanitized securely', {
          url: req.url,
          method: req.method,
          originalLength: originalRules.length,
          sanitizedLength: sanitizedRules.length,
          changes: originalRules.length !== sanitizedRules.length,
          ip: req.ip
        });
      }

      next();
    } catch (error) {
      logger.errorWithContext(error, { 
        context: 'Automod rules sanitization',
        url: req.url,
        method: req.method,
        ip: req.ip
      });
      
      res.status(400).json({
        success: false,
        error: 'Invalid automod rules data'
      });
    }
  };
}

/**
 * Secure template sanitization middleware
 * Specifically sanitizes template data with validation
 * 
 * @returns {Function} - Express middleware function
 */
function sanitizeTemplates() {
  return (req, res, next) => {
    try {
      if (req.body) {
        const originalBody = JSON.stringify(req.body);
        
        // Validate body structure
        if (typeof req.body !== 'object') {
          logger.security('Invalid template body structure', {
            url: req.url,
            method: req.method,
            type: typeof req.body
          });
          return res.status(400).json({
            success: false,
            error: 'Invalid template data format'
          });
        }
        
        const sanitizedBody = sanitizeTemplate(req.body);
        
        // Replace body with sanitized version
        Object.keys(req.body).forEach(key => {
          if (sanitizedBody[key] !== undefined) {
            req.body[key] = sanitizedBody[key];
          }
        });

        logger.security('Template data sanitized securely', {
          url: req.url,
          method: req.method,
          originalLength: originalBody.length,
          sanitizedLength: JSON.stringify(req.body).length,
          ip: req.ip
        });
      }

      next();
    } catch (error) {
      logger.errorWithContext(error, { 
        context: 'Template sanitization',
        url: req.url,
        method: req.method,
        ip: req.ip
      });
      
      res.status(400).json({
        success: false,
        error: 'Invalid template data'
      });
    }
  };
}

/**
 * Secure URL sanitization middleware
 * Validates and sanitizes URLs in request data with domain restrictions
 * 
 * @param {Array} allowedDomains - List of allowed domains
 * @returns {Function} - Express middleware function
 */
function sanitizeUrls(allowedDomains = []) {
  return (req, res, next) => {
    try {
      const sanitizedUrls = [];
      const removedUrls = [];

      // Check body for URLs
      if (req.body) {
        Object.keys(req.body).forEach(key => {
          if (typeof req.body[key] === 'string' && 
              (req.body[key].startsWith('http://') || req.body[key].startsWith('https://'))) {
            const sanitizedUrl = sanitizeUrl(req.body[key], allowedDomains);
            if (sanitizedUrl) {
              req.body[key] = sanitizedUrl;
              sanitizedUrls.push({ field: key, url: sanitizedUrl });
            } else {
              // Remove invalid URL
              removedUrls.push({ field: key, url: req.body[key] });
              delete req.body[key];
            }
          }
        });
      }

      // Check query for URLs
      if (req.query) {
        Object.keys(req.query).forEach(key => {
          if (typeof req.query[key] === 'string' && 
              (req.query[key].startsWith('http://') || req.query[key].startsWith('https://'))) {
            const sanitizedUrl = sanitizeUrl(req.query[key], allowedDomains);
            if (sanitizedUrl) {
              req.query[key] = sanitizedUrl;
              sanitizedUrls.push({ field: key, url: sanitizedUrl });
            } else {
              // Remove invalid URL
              removedUrls.push({ field: key, url: req.query[key] });
              delete req.query[key];
            }
          }
        });
      }

      if (sanitizedUrls.length > 0 || removedUrls.length > 0) {
        logger.security('URLs processed securely', {
          url: req.url,
          method: req.method,
          sanitizedCount: sanitizedUrls.length,
          removedCount: removedUrls.length,
          ip: req.ip
        });
      }

      next();
    } catch (error) {
      logger.errorWithContext(error, { 
        context: 'URL sanitization',
        url: req.url,
        method: req.method,
        ip: req.ip
      });
      
      res.status(400).json({
        success: false,
        error: 'Invalid URL data'
      });
    }
  };
}

/**
 * Secure Discord content sanitization middleware
 * Sanitizes Discord-specific content like mentions and formatting
 * 
 * @returns {Function} - Express middleware function
 */
function sanitizeDiscordContentMiddleware() {
  return (req, res, next) => {
    try {
      let sanitizedFields = [];

      // Sanitize body content
      if (req.body) {
        Object.keys(req.body).forEach(key => {
          if (typeof req.body[key] === 'string') {
            const original = req.body[key];
            req.body[key] = sanitizeDiscordContent(original);
            
            if (original !== req.body[key]) {
              sanitizedFields.push(key);
            }
          }
        });
      }

      // Sanitize query content
      if (req.query) {
        Object.keys(req.query).forEach(key => {
          if (typeof req.query[key] === 'string') {
            const original = req.query[key];
            req.query[key] = sanitizeDiscordContent(original);
            
            if (original !== req.query[key]) {
              sanitizedFields.push(`query.${key}`);
            }
          }
        });
      }

      if (sanitizedFields.length > 0) {
        logger.security('Discord content sanitized securely', {
          url: req.url,
          method: req.method,
          sanitizedFields,
          ip: req.ip
        });
      }

      next();
    } catch (error) {
      logger.errorWithContext(error, { 
        context: 'Discord content sanitization',
        url: req.url,
        method: req.method,
        ip: req.ip
      });
      
      res.status(400).json({
        success: false,
        error: 'Invalid Discord content'
      });
    }
  };
}

/**
 * Secure file upload sanitization middleware
 * Sanitizes file names and metadata with validation
 * 
 * @returns {Function} - Express middleware function
 */
function sanitizeFileUploads() {
  return (req, res, next) => {
    try {
      if (req.file) {
        const originalName = req.file.originalname;
        req.file.originalname = sanitizeFilename(originalName);
        
        if (originalName !== req.file.originalname) {
          logger.security('File name sanitized securely', {
            url: req.url,
            method: req.method,
            originalName: originalName.substring(0, 50),
            sanitizedName: req.file.originalname,
            ip: req.ip
          });
        }
      }

      if (req.files && Array.isArray(req.files)) {
        req.files.forEach(file => {
          const originalName = file.originalname;
          file.originalname = sanitizeFilename(originalName);
          
          if (originalName !== file.originalname) {
            logger.security('File name sanitized securely', {
              url: req.url,
              method: req.method,
              originalName: originalName.substring(0, 50),
              sanitizedName: file.originalname,
              ip: req.ip
            });
          }
        });
      }

      next();
    } catch (error) {
      logger.errorWithContext(error, { 
        context: 'File upload sanitization',
        url: req.url,
        method: req.method,
        ip: req.ip
      });
      
      res.status(400).json({
        success: false,
        error: 'Invalid file data'
      });
    }
  };
}

module.exports = {
  sanitizeAll,
  sanitizeAutomodRules,
  sanitizeTemplates,
  sanitizeUrls,
  sanitizeDiscordContentMiddleware,
  sanitizeFileUploads,
  validateRequestSize,
  deepSanitize,
  sanitizeFilename
}; 