/**
 * Input Sanitization Utilities
 * 
 * This module provides comprehensive input sanitization and validation
 * for the Syro Discord bot to prevent XSS, injection attacks, and data corruption.
 * 
 * Features:
 * - HTML sanitization
 * - Text cleaning and validation
 * - URL validation and sanitization
 * - File name sanitization
 * - JSON structure validation
 * - Discord-specific sanitization
 * 
 * @author Syro Development Team
 * @version 1.0.0
 */

const sanitizeHtml = require('sanitize-html');
const validator = require('validator');
const xss = require('xss');
const logger = require('./logger');

/**
 * HTML Sanitization Configuration
 * Defines what HTML tags and attributes are allowed
 */
const HTML_SANITIZE_OPTIONS = {
  allowedTags: [
    'b', 'i', 'em', 'strong', 'u', 's', 'code', 'pre', 'br', 'p', 'div', 'span'
  ],
  allowedAttributes: {
    '*': ['class', 'style']
  },
  allowedStyles: {
    '*': {
      'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
      'text-align': [/^left$/, /^right$/, /^center$/],
      'font-size': [/^\d+(?:px|em|%)$/]
    }
  },
  disallowedTagsMode: 'recursiveEscape'
};

/**
 * Sanitize HTML content
 * Removes dangerous HTML tags and attributes while preserving safe formatting
 * 
 * @param {string} html - HTML content to sanitize
 * @param {Object} options - Custom sanitization options
 * @returns {string} - Sanitized HTML content
 */
function sanitizeHtmlContent(html, options = {}) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  try {
    const sanitizeOptions = { ...HTML_SANITIZE_OPTIONS, ...options };
    const sanitized = sanitizeHtml(html, sanitizeOptions);
    
    logger.security('HTML content sanitized', {
      originalLength: html.length,
      sanitizedLength: sanitized.length,
      removedContent: html.length - sanitized.length
    });
    
    return sanitized;
  } catch (error) {
    logger.errorWithContext(error, { context: 'HTML sanitization' });
    return '';
  }
}

/**
 * Sanitize plain text content
 * Removes dangerous characters and normalizes text
 * 
 * @param {string} text - Text content to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} - Sanitized text content
 */
function sanitizeText(text, maxLength = 1000) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  try {
    // Remove null bytes and control characters
    let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    // Truncate if too long
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
      logger.warn('Text truncated due to length limit', {
        originalLength: text.length,
        maxLength,
        truncated: true
      });
    }
    
    return sanitized;
  } catch (error) {
    logger.errorWithContext(error, { context: 'Text sanitization' });
    return '';
  }
}

/**
 * Validate and sanitize URL
 * Ensures URL is safe and properly formatted
 * 
 * @param {string} url - URL to validate and sanitize
 * @param {Array} allowedDomains - List of allowed domains
 * @returns {string|null} - Sanitized URL or null if invalid
 */
function sanitizeUrl(url, allowedDomains = []) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    // Basic URL validation
    if (!validator.isURL(url, { 
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true
    })) {
      logger.security('Invalid URL format', { url });
      return null;
    }

    // Check against allowed domains if specified
    if (allowedDomains.length > 0) {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();
      
      if (!allowedDomains.some(allowed => 
        domain === allowed.toLowerCase() || 
        domain.endsWith('.' + allowed.toLowerCase())
      )) {
        logger.security('URL domain not allowed', { 
          url, 
          domain, 
          allowedDomains 
        });
        return null;
      }
    }

    // Sanitize URL parameters
    const sanitized = xss(url);
    
    logger.security('URL sanitized', { 
      originalUrl: url, 
      sanitizedUrl: sanitized 
    });
    
    return sanitized;
  } catch (error) {
    logger.errorWithContext(error, { context: 'URL sanitization' });
    return null;
  }
}

/**
 * Sanitize file name
 * Removes dangerous characters and ensures safe file names
 * 
 * @param {string} filename - File name to sanitize
 * @returns {string} - Sanitized file name
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file';
  }

  try {
    // Remove dangerous characters
    let sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    
    // Remove multiple consecutive underscores
    sanitized = sanitized.replace(/_+/g, '_');
    
    // Remove leading/trailing dots and underscores
    sanitized = sanitized.replace(/^[._]+|[._]+$/g, '');
    
    // Ensure it's not empty
    if (!sanitized) {
      sanitized = 'unnamed_file';
    }
    
    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.split('.').pop();
      const name = sanitized.substring(0, 255 - ext.length - 1);
      sanitized = `${name}.${ext}`;
    }
    
    return sanitized;
  } catch (error) {
    logger.errorWithContext(error, { context: 'Filename sanitization' });
    return 'unnamed_file';
  }
}

/**
 * Sanitize Discord-specific content
 * Cleans Discord mentions, emojis, and formatting
 * 
 * @param {string} content - Discord content to sanitize
 * @returns {string} - Sanitized Discord content
 */
function sanitizeDiscordContent(content) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  try {
    let sanitized = content;
    
    // Remove Discord mentions but keep the text
    sanitized = sanitized.replace(/<@!?(\d+)>/g, '@user');
    sanitized = sanitized.replace(/<@&(\d+)>/g, '@role');
    sanitized = sanitized.replace(/<#(\d+)>/g, '#channel');
    
    // Remove custom emojis but keep the name
    sanitized = sanitized.replace(/<a?:(\w+):\d+>/g, ':$1:');
    
    // Remove Discord formatting but keep text
    sanitized = sanitized.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold
    sanitized = sanitized.replace(/\*(.*?)\*/g, '$1'); // Italic
    sanitized = sanitized.replace(/__(.*?)__/g, '$1'); // Underline
    sanitized = sanitized.replace(/~~(.*?)~~/g, '$1'); // Strikethrough
    sanitized = sanitized.replace(/`(.*?)`/g, '$1'); // Inline code
    sanitized = sanitized.replace(/```[\s\S]*?```/g, '[code block]'); // Code blocks
    
    // Final text sanitization
    sanitized = sanitizeText(sanitized, 2000);
    
    return sanitized;
  } catch (error) {
    logger.errorWithContext(error, { context: 'Discord content sanitization' });
    return '';
  }
}

/**
 * Validate and sanitize JSON object
 * Ensures JSON structure is valid and safe
 * 
 * @param {Object} data - JSON object to validate
 * @param {Object} schema - Joi schema for validation
 * @returns {Object|null} - Sanitized object or null if invalid
 */
function sanitizeJsonObject(data, schema = null) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  try {
    // Deep clone to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // Recursively sanitize string values
    function sanitizeObject(obj) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          obj[key] = sanitizeText(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitizeObject(value);
        }
      }
    }
    
    sanitizeObject(sanitized);
    
    // Validate against schema if provided
    if (schema) {
      const { error } = schema.validate(sanitized);
      if (error) {
        logger.security('JSON validation failed', { 
          error: error.message,
          data: JSON.stringify(sanitized).substring(0, 200)
        });
        return null;
      }
    }
    
    return sanitized;
  } catch (error) {
    logger.errorWithContext(error, { context: 'JSON sanitization' });
    return null;
  }
}

/**
 * Sanitize automod rule data
 * Specific sanitization for automoderation rules
 * 
 * @param {Object} ruleData - Automod rule data
 * @returns {Object} - Sanitized rule data
 */
function sanitizeAutomodRule(ruleData) {
  if (!ruleData || typeof ruleData !== 'object') {
    return {};
  }

  try {
    const sanitized = {};
    
    // Sanitize basic fields
    if (ruleData.title) {
      sanitized.title = sanitizeText(ruleData.title, 100);
    }
    
    if (ruleData.description) {
      sanitized.description = sanitizeText(ruleData.description, 500);
    }
    
    // Validate numeric fields
    if (ruleData.messageCount) {
      const count = parseInt(ruleData.messageCount);
      sanitized.messageCount = isNaN(count) ? 5 : Math.max(1, Math.min(100, count));
    }
    
    if (ruleData.timeWindow) {
      const window = parseInt(ruleData.timeWindow);
      sanitized.timeWindow = isNaN(window) ? 10 : Math.max(1, Math.min(3600, window));
    }
    
    if (ruleData.joinCount) {
      const joins = parseInt(ruleData.joinCount);
      sanitized.joinCount = isNaN(joins) ? 10 : Math.max(1, Math.min(1000, joins));
    }
    
    if (ruleData.channelCount) {
      const channels = parseInt(ruleData.channelCount);
      sanitized.channelCount = isNaN(channels) ? 5 : Math.max(1, Math.min(100, channels));
    }
    
    if (ruleData.roleCount) {
      const roles = parseInt(ruleData.roleCount);
      sanitized.roleCount = isNaN(roles) ? 5 : Math.max(1, Math.min(100, roles));
    }
    
    if (ruleData.lockdownDuration) {
      const duration = parseInt(ruleData.lockdownDuration);
      sanitized.lockdownDuration = isNaN(duration) ? 30 : Math.max(1, Math.min(1440, duration));
    }
    
    // Validate raid type
    if (ruleData.raidType) {
      const validTypes = ['join', 'channel', 'role'];
      sanitized.raidType = validTypes.includes(ruleData.raidType) ? ruleData.raidType : 'join';
    }
    
    // Validate ID
    if (ruleData.id) {
      const id = parseInt(ruleData.id);
      sanitized.id = isNaN(id) ? Date.now() : id;
    }
    
    return sanitized;
  } catch (error) {
    logger.errorWithContext(error, { context: 'Automod rule sanitization' });
    return {};
  }
}

/**
 * Sanitize template data
 * Specific sanitization for Discord templates
 * 
 * @param {Object} templateData - Template data
 * @returns {Object} - Sanitized template data
 */
function sanitizeTemplate(templateData) {
  if (!templateData || typeof templateData !== 'object') {
    return {};
  }

  try {
    const sanitized = {};
    
    // Sanitize basic fields
    if (templateData.name) {
      sanitized.name = sanitizeText(templateData.name, 100);
    }
    
    if (templateData.tags) {
      if (Array.isArray(templateData.tags)) {
        sanitized.tags = templateData.tags
          .filter(tag => typeof tag === 'string')
          .map(tag => sanitizeText(tag, 50))
          .slice(0, 10); // Limit to 10 tags
      } else {
        sanitized.tags = [sanitizeText(templateData.tags, 50)];
      }
    }
    
    // Validate and sanitize link
    if (templateData.link) {
      const sanitizedLink = sanitizeUrl(templateData.link, [
        'discord.com',
        'discord.new'
      ]);
      if (sanitizedLink) {
        sanitized.link = sanitizedLink;
      }
    }
    
    // Sanitize icon URL
    if (templateData.icon) {
      const sanitizedIcon = sanitizeUrl(templateData.icon, [
        'cdn.discordapp.com',
        'media.discordapp.net'
      ]);
      if (sanitizedIcon) {
        sanitized.icon = sanitizedIcon;
      }
    }
    
    // Sanitize user info
    if (templateData.userId) {
      sanitized.userId = sanitizeText(templateData.userId, 50);
    }
    
    if (templateData.username) {
      sanitized.username = sanitizeText(templateData.username, 100);
    }
    
    return sanitized;
  } catch (error) {
    logger.errorWithContext(error, { context: 'Template sanitization' });
    return {};
  }
}

module.exports = {
  sanitizeHtmlContent,
  sanitizeText,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeDiscordContent,
  sanitizeJsonObject,
  sanitizeAutomodRule,
  sanitizeTemplate
}; 