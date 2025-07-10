/**
 * Sanitization Middleware
 * 
 * This middleware automatically sanitizes incoming request data
 * to prevent XSS, injection attacks, and data corruption.
 * 
 * @author Syro Development Team
 * @version 1.0.0
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

/**
 * General sanitization middleware
 * Sanitizes all incoming request data
 * 
 * @returns {Function} - Express middleware function
 */
function sanitizeAll() {
  return (req, res, next) => {
    try {
      // LOG: Estado inicial
      logger.warn('[SANITIZE-ALL] BEFORE', {
        url: req.url,
        method: req.method,
        query: JSON.stringify(req.query),
        body: JSON.stringify(req.body),
        params: JSON.stringify(req.params)
      });

      // Sanitize query parameters
      if (req.query) {
        Object.keys(req.query).forEach(key => {
          if (typeof req.query[key] === 'string') {
            req.query[key] = sanitizeText(req.query[key]);
          }
        });
      }

      // Sanitize body parameters
      if (req.body) {
        Object.keys(req.body).forEach(key => {
          if (typeof req.body[key] === 'string') {
            req.body[key] = sanitizeText(req.body[key]);
          }
        });
      }

      // Sanitize URL parameters
      if (req.params) {
        Object.keys(req.params).forEach(key => {
          if (typeof req.params[key] === 'string') {
            req.params[key] = sanitizeText(req.params[key]);
          }
        });
      }

      // LOG: Estado después de sanitizar
      logger.warn('[SANITIZE-ALL] AFTER', {
        url: req.url,
        method: req.method,
        query: JSON.stringify(req.query),
        body: JSON.stringify(req.body),
        params: JSON.stringify(req.params)
      });

      logger.security('Request data sanitized', {
        url: req.url,
        method: req.method,
        hasQuery: !!req.query,
        hasBody: !!req.body,
        hasParams: !!req.params
      });

      next();
    } catch (error) {
      logger.errorWithContext(error, { context: 'General sanitization' });
      next();
    }
  };
}

/**
 * Automod rule sanitization middleware
 * Specifically sanitizes automod rule data
 * 
 * @returns {Function} - Express middleware function
 */
function sanitizeAutomodRules() {
  return (req, res, next) => {
    try {
      if (req.body && req.body.automodRules) {
        const originalRules = JSON.stringify(req.body.automodRules);
        
        // Sanitize each rule category
        Object.keys(req.body.automodRules).forEach(category => {
          if (Array.isArray(req.body.automodRules[category])) {
            req.body.automodRules[category] = req.body.automodRules[category].map(rule => 
              sanitizeAutomodRule(rule)
            );
          }
        });

        const sanitizedRules = JSON.stringify(req.body.automodRules);
        
        logger.security('Automod rules sanitized', {
          url: req.url,
          method: req.method,
          originalLength: originalRules.length,
          sanitizedLength: sanitizedRules.length,
          changes: originalRules.length !== sanitizedRules.length
        });
      }

      next();
    } catch (error) {
      logger.errorWithContext(error, { context: 'Automod rules sanitization' });
      next();
    }
  };
}

/**
 * Template sanitization middleware
 * Specifically sanitizes template data
 * 
 * @returns {Function} - Express middleware function
 */
function sanitizeTemplates() {
  return (req, res, next) => {
    try {
      if (req.body) {
        const originalBody = JSON.stringify(req.body);
        const sanitizedBody = sanitizeTemplate(req.body);
        
        // Replace body with sanitized version
        Object.keys(req.body).forEach(key => {
          if (sanitizedBody[key] !== undefined) {
            req.body[key] = sanitizedBody[key];
          }
        });

        logger.security('Template data sanitized', {
          url: req.url,
          method: req.method,
          originalLength: originalBody.length,
          sanitizedLength: JSON.stringify(req.body).length
        });
      }

      next();
    } catch (error) {
      logger.errorWithContext(error, { context: 'Template sanitization' });
      next();
    }
  };
}

/**
 * URL sanitization middleware
 * Validates and sanitizes URLs in request data
 * 
 * @param {Array} allowedDomains - List of allowed domains
 * @returns {Function} - Express middleware function
 */
function sanitizeUrls(allowedDomains = []) {
  return (req, res, next) => {
    try {
      const sanitizedUrls = [];

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
              delete req.body[key];
              logger.security('Invalid URL removed', { field: key, url: req.body[key] });
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
              delete req.query[key];
              logger.security('Invalid URL removed from query', { field: key, url: req.query[key] });
            }
          }
        });
      }

      if (sanitizedUrls.length > 0) {
        logger.security('URLs sanitized', {
          url: req.url,
          method: req.method,
          sanitizedUrls
        });
      }

      next();
    } catch (error) {
      logger.errorWithContext(error, { context: 'URL sanitization' });
      next();
    }
  };
}

/**
 * Discord content sanitization middleware
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
        logger.security('Discord content sanitized', {
          url: req.url,
          method: req.method,
          sanitizedFields
        });
      }

      next();
    } catch (error) {
      logger.errorWithContext(error, { context: 'Discord content sanitization' });
      next();
    }
  };
}

/**
 * File upload sanitization middleware
 * Sanitizes file names and metadata
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
          logger.security('File name sanitized', {
            url: req.url,
            method: req.method,
            originalName,
            sanitizedName: req.file.originalname
          });
        }
      }

      if (req.files) {
        req.files.forEach(file => {
          const originalName = file.originalname;
          file.originalname = sanitizeFilename(originalName);
          
          if (originalName !== file.originalname) {
            logger.security('File name sanitized', {
              url: req.url,
              method: req.method,
              originalName,
              sanitizedName: file.originalname
            });
          }
        });
      }

      next();
    } catch (error) {
      logger.errorWithContext(error, { context: 'File upload sanitization' });
      next();
    }
  };
}

module.exports = {
  sanitizeAll,
  sanitizeAutomodRules,
  sanitizeTemplates,
  sanitizeUrls,
  sanitizeDiscordContentMiddleware,
  sanitizeFileUploads
}; 