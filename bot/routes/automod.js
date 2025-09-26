/**
 * Automoderation API Routes
 * 
 * This module provides REST API endpoints for managing automoderation rules
 * for Discord servers. It handles CRUD operations for spam detection,
 * raid protection, and other moderation features.
 * 
 * @author Syro Development Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const ServerConfig = require('../models/ServerConfig');
const Joi = require('joi');
const { validateDiscordPermissions, validateBotPresence, validateConditionally } = require('../middleware/auth');
const { sanitizeAll, sanitizeAutomodRules } = require('../middleware/sanitizer');
const rateLimit = require('express-rate-limit');
const { invalidateServerConfigCache } = require('../services/cacheManager');

/**
 * Rate limiter for automod endpoints
 * Prevents abuse and excessive requests.
 */
const automodLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // TEMPORAL: aumentar a 500 para pruebas. Volver a 30 después.
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many automod requests, please try again later.'
  }
});

// Apply rate limiting to all automod endpoints
router.use('/', automodLimiter);

/**
 * GET /servers/:guildId/automod/rules
 * 
 * Retrieves all automoderation rules for a specific Discord server.
 * If no configuration exists, creates a default configuration.
 * 
 * @param {string} guildId - Discord server ID
 * @returns {Object} JSON response with automod rules
 * 
 * @example
 * GET /servers/123456789/automod/rules
 * Response: { success: true, automodRules: { Spam: [], Raids: [], ... } }
 */
router.get('/servers/:guildId/automod/rules', 
  validateConditionally('admin'),
  async (req, res) => {
  try {
    const { guildId } = req.params;
    console.log(`🔍 Buscando configuración de automod para guild: ${guildId}`);
    
    // Find existing server configuration
    let serverConfig = await ServerConfig.findOne({ serverId: guildId });
    
    if (!serverConfig) {
      console.log(`📝 Creando configuración por defecto para guild: ${guildId}`);
      // Create default configuration if none exists
      serverConfig = new ServerConfig({
        serverId: guildId,
        automodRules: {
          Spam: [],
          Words: [],
          Links: [],
          Raids: [],
          Mentions: [],
          NSFW: [],
          Caps: [],
          Emojis: [],
          Flood: [],
          Slowmode: [],
          Mute: [],
          Logs: []
        }
      });
      await serverConfig.save();
      console.log(`✅ Configuración creada exitosamente para guild: ${guildId}`);
    } else {
      console.log(`✅ Configuración encontrada para guild: ${guildId}`);
    }
    
    res.json({
      success: true,
      automodRules: serverConfig.automodRules
    });
  } catch (error) {
    console.error('❌ Error getting automod rules:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Esquema de validación para automodRules
const automodRulesSchema = Joi.object({
  Spam: Joi.array().items(
    Joi.object({
      id: Joi.number().required(),
      title: Joi.string().required(),
      description: Joi.string().allow(''),
      messageCount: Joi.number().min(1).max(100).required(),
      timeWindow: Joi.number().min(1).max(3600).required()
    }).unknown(true) // Permitir campos adicionales como _id, __v, etc.
  ),
  Raids: Joi.array().items(
    Joi.object({
      id: Joi.number().required(),
      title: Joi.string().required(),
      description: Joi.string().allow(''),
      joinCount: Joi.number().min(1).max(1000).optional(),
      channelCount: Joi.number().min(1).max(100).optional(),
      roleCount: Joi.number().min(1).max(100).optional(),
      timeWindow: Joi.number().min(1).max(3600).required(),
      lockdownDuration: Joi.number().min(1).max(1440).required(),
      raidType: Joi.string().valid('join', 'channel', 'role').required()
    }).unknown(true) // Permitir campos adicionales como _id, __v, etc.
  ),
  Words: Joi.array().optional(),
  Links: Joi.array().optional(),
  Mentions: Joi.array().optional(),
  NSFW: Joi.array().optional(),
  Caps: Joi.array().optional(),
  Emojis: Joi.array().optional(),
  Flood: Joi.array().optional(),
  Slowmode: Joi.array().optional(),
  Mute: Joi.array().optional(),
  Logs: Joi.array().optional()
}).unknown(true); // Permitir campos adicionales

/**
 * PUT /servers/:guildId/automod/rules
 * 
 * Updates all automoderation rules for a specific Discord server.
 * Replaces the entire automodRules object with the provided data.
 * 
 * @param {string} guildId - Discord server ID
 * @param {Object} automodRules - Complete automod rules object
 * @returns {Object} JSON response with success message
 * 
 * @example
 * PUT /servers/123456789/automod/rules
 * Body: { automodRules: { Spam: [{...}], Raids: [{...}] } }
 * Response: { success: true, message: 'Rules updated successfully' }
 */
router.put('/servers/:guildId/automod/rules', 
  sanitizeAll(),
  sanitizeAutomodRules(),
  validateConditionally('admin'),
  async (req, res) => {
  try {
    const { guildId } = req.params;
    const { automodRules } = req.body;

    console.log('🔍 Datos recibidos en PUT /automod/rules:');
    console.log('📋 GuildId:', guildId);
    console.log('📋 automodRules:', JSON.stringify(automodRules, null, 2));

    // Validar automodRules con Joi
    const { error } = automodRulesSchema.validate(automodRules);
    if (error) {
      console.error('❌ Error de validación:', error.details);
      return res.status(400).json({
        success: false,
        error: `Error de validación: ${error.details[0].message}`,
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    console.log('✅ Validación exitosa, guardando datos...');

    // Find or create server configuration
    let serverConfig = await ServerConfig.findOne({ serverId: guildId });

    if (!serverConfig) {
      serverConfig = new ServerConfig({ serverId: guildId });
    }

    // Update automod rules
    serverConfig.automodRules = automodRules;
    serverConfig.updatedAt = new Date();

    await serverConfig.save();

    console.log('✅ Datos guardados exitosamente');

    res.json({
      success: true,
      message: 'Rules updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating automod rules:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /servers/:guildId/automod/rules
 * 
 * Adds a specific automoderation rule to a feature category.
 * 
 * @param {string} guildId - Discord server ID
 * @param {string} featureName - Feature category (e.g., 'Spam', 'Raids')
 * @param {Object} rule - Rule object to add
 * @returns {Object} JSON response with success message
 * 
 * @example
 * POST /servers/123456789/automod/rules
 * Body: { featureName: 'Spam', rule: { id: 1, messageCount: 5, timeWindow: 10 } }
 * Response: { success: true, message: 'Rule added successfully' }
 */
router.post('/servers/:guildId/automod/rules', 
  sanitizeAll(),
  sanitizeAutomodRules(),
  validateConditionally('admin'),
  async (req, res) => {
  try {
    const { guildId } = req.params;
    const { featureName, rule } = req.body;
    
    // Find or create server configuration
    let serverConfig = await ServerConfig.findOne({ serverId: guildId });
    
    if (!serverConfig) {
      serverConfig = new ServerConfig({ serverId: guildId });
    }
    
    // Initialize feature array if it doesn't exist
    if (!serverConfig.automodRules[featureName]) {
      serverConfig.automodRules[featureName] = [];
    }
    
    // Add the new rule
    serverConfig.automodRules[featureName].push(rule);
    serverConfig.updatedAt = new Date();
    
    await serverConfig.save();
    
    res.json({
      success: true,
      message: 'Rule added successfully'
    });
  } catch (error) {
    console.error('Error adding automod rule:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /servers/:guildId/automod/rules/:ruleId
 * 
 * Deletes a specific automoderation rule by ID.
 * 
 * @param {string} guildId - Discord server ID
 * @param {string} ruleId - Rule ID to delete
 * @param {string} featureName - Feature category (query parameter)
 * @returns {Object} JSON response with success message
 * 
 * @example
 * DELETE /servers/123456789/automod/rules/1?featureName=Spam
 * Response: { success: true, message: 'Rule deleted successfully' }
 */
router.delete('/servers/:guildId/automod/rules/:ruleId', async (req, res) => {
  try {
    const { guildId, ruleId } = req.params;
    const { featureName } = req.query;
    
    // Find server configuration
    const serverConfig = await ServerConfig.findOne({ serverId: guildId });
    
    if (!serverConfig) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }
    
    // Remove the rule from the specified feature
    if (serverConfig.automodRules[featureName]) {
      serverConfig.automodRules[featureName] = serverConfig.automodRules[featureName]
        .filter(rule => rule.id !== parseInt(ruleId));
    }
    
    serverConfig.updatedAt = new Date();
    await serverConfig.save();
    
    res.json({
      success: true,
      message: 'Rule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting automod rule:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /servers/:guildId/automod/excluded-roles
 *
 * Retrieves the excluded roles for automoderation for a specific Discord server.
 *
 * @param {string} guildId - Discord server ID
 * @returns {Object} JSON response with excludedRoles array
 *
 * @example
 * GET /servers/123456789/automod/excluded-roles
 * Response: { success: true, excludedRoles: [ ... ] }
 */
router.get('/servers/:guildId/automod/excluded-roles',
  validateConditionally('admin'),
  async (req, res) => {
    try {
      const { guildId } = req.params;
      console.log(`[AUTOMOD][GET][excluded-roles] GuildId: ${guildId}`);
      let serverConfig = await ServerConfig.findOne({ serverId: guildId });
      if (!serverConfig) {
        console.log(`[AUTOMOD][GET][excluded-roles] No config found, creating default for guild: ${guildId}`);
        serverConfig = new ServerConfig({ serverId: guildId, excludedRoles: [] });
        await serverConfig.save();
      }
      console.log(`[AUTOMOD][GET][excluded-roles] Found config:`, !!serverConfig, `ExcludedRoles:`, Array.isArray(serverConfig.excludedRoles) ? serverConfig.excludedRoles.length : 'none');
      res.json({
        success: true,
        excludedRoles: serverConfig.excludedRoles || []
      });
    } catch (error) {
      console.error('[AUTOMOD][GET][excluded-roles] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

/**
 * PUT /servers/:guildId/automod/excluded-roles
 *
 * Updates the excluded roles for automoderation for a specific Discord server.
 *
 * @param {string} guildId - Discord server ID
 * @param {Array} excludedRoles - Array of role objects to exclude
 * @returns {Object} JSON response with success message
 *
 * @example
 * PUT /servers/123456789/automod/excluded-roles
 * Body: { excludedRoles: [ { id, name, color, position } ] }
 * Response: { success: true, message: 'Excluded roles updated successfully' }
 */
router.put('/servers/:guildId/automod/excluded-roles',
  sanitizeAll(),
  validateConditionally('admin'),
  async (req, res) => {
    try {
      const { guildId } = req.params;
      const { excludedRoles } = req.body;
      console.log(`[AUTOMOD][PUT][excluded-roles] GuildId: ${guildId}`);
      console.log(`[AUTOMOD][PUT][excluded-roles] Payload:`, excludedRoles);
      if (!Array.isArray(excludedRoles)) {
        console.warn('[AUTOMOD][PUT][excluded-roles] excludedRoles is not an array');
        return res.status(400).json({ success: false, error: 'excludedRoles must be an array' });
      }
      // Basic validation for each role
      for (const role of excludedRoles) {
        if (!role.id || !role.name || !role.color || typeof role.position !== 'number') {
          console.warn('[AUTOMOD][PUT][excluded-roles] Invalid role:', role);
          return res.status(400).json({ success: false, error: 'Each role must have id, name, color, and position' });
        }
      }
      let serverConfig = await ServerConfig.findOne({ serverId: guildId });
      if (!serverConfig) {
        console.log(`[AUTOMOD][PUT][excluded-roles] No config found, creating default for guild: ${guildId}`);
        serverConfig = new ServerConfig({ serverId: guildId });
      }
      serverConfig.excludedRoles = excludedRoles;
      serverConfig.updatedAt = new Date();
      await serverConfig.save();
      // Invalidate config cache for this guild so next automod event uses latest config
      await invalidateServerConfigCache(guildId);
      console.log(`[AUTOMOD][PUT][excluded-roles] Saved excludedRoles (${excludedRoles.length}) for guild: ${guildId}`);
      res.json({ success: true, message: 'Excluded roles updated successfully' });
    } catch (error) {
      console.error('[AUTOMOD][PUT][excluded-roles] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

module.exports = router; 