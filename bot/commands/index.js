/**
 * @fileoverview Commands System - Main Entry Point
 * 
 * Main entry point for the Syro bot command system.
 * Integrates all core components: CommandManager, CommandRegistry,
 * PermissionManager, CooldownManager, and CommandExecutor.
 * 
 * Provides a unified interface for command management and execution.
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const CommandManager = require('./core/CommandManager');
const logger = require('../utils/logger');

/**
 * Commands System Class
 * 
 * Main orchestrator for the entire command system.
 * Provides high-level interface for command management and execution.
 * 
 * @class CommandsSystem
 */
class CommandsSystem {
  /**
   * Initialize the Commands System
   * 
   * @param {Object} options - Configuration options
   * @param {Object} options.commandManager - CommandManager options
   * @param {Object} options.permissionManager - PermissionManager options
   * @param {Object} options.cooldownManager - CooldownManager options
   * @param {Object} options.commandExecutor - CommandExecutor options
   */
  constructor(options = {}) {
    this.options = options;
    
    // Initialize core components
    this.commandManager = new CommandManager(options.commandManager || {});
    
    // Store references to sub-components for direct access
    this.registry = this.commandManager.registry;
    this.permissionManager = this.commandManager.permissionManager;
    this.cooldownManager = this.commandManager.cooldownManager;
    this.executor = this.commandManager.executor;
    
    // Initialize the system
    this._initialize();
  }

  /**
   * Initialize the commands system
   * 
   * @private
   */
  _initialize() {
    try {
      logger.info('🚀 Initializing Commands System...');
      
      // Load default commands
      this._loadDefaultCommands();
      
      logger.info('✅ Commands System initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Commands System:', error);
      throw error;
    }
  }

  /**
   * Load default commands
   * 
   * @private
   */
  _loadDefaultCommands() {
    // TODO: Load commands from categories when they are implemented
    logger.info('📦 Default commands will be loaded in Phase 2');
  }

  /**
   * Execute a command from a message
   * 
   * @param {Message} message - Discord message object
   * @returns {Promise<boolean>} Execution success status
   */
  async executeCommand(message) {
    return await this.commandManager.executeCommand(message);
  }

  /**
   * Register a new command
   * 
   * @param {Object} command - Command configuration object
   * @returns {boolean} Registration success status
   */
  registerCommand(command) {
    return this.commandManager.registerCommand(command);
  }

  /**
   * Unregister a command
   * 
   * @param {string} commandName - Command name to unregister
   * @returns {boolean} Unregistration success status
   */
  unregisterCommand(commandName) {
    return this.commandManager.unregisterCommand(commandName);
  }

  /**
   * Get command by name or alias
   * 
   * @param {string} identifier - Command name or alias
   * @returns {Object|null} Command object or null if not found
   */
  getCommand(identifier) {
    return this.registry.get(identifier);
  }

  /**
   * Get all commands
   * 
   * @returns {Collection} All registered commands
   */
  getAllCommands() {
    return this.registry.getAll();
  }

  /**
   * Get commands by category
   * 
   * @param {string} category - Category name
   * @returns {Collection} Commands in category
   */
  getCommandsByCategory(category) {
    return this.commandManager.getCommandsByCategory(category);
  }

  /**
   * Get all categories
   * 
   * @returns {Collection} All categories
   */
  getAllCategories() {
    return this.commandManager.getAllCategories();
  }

  /**
   * Set server prefix
   * 
   * @param {string} guildId - Guild ID
   * @param {string} prefix - New prefix
   * @returns {Promise<boolean>} Success status
   */
  async setServerPrefix(guildId, prefix) {
    return await this.commandManager.setServerPrefix(guildId, prefix);
  }

  /**
   * Get server prefix
   * 
   * @param {string} guildId - Guild ID
   * @returns {Promise<string>} Server prefix
   */
  async getServerPrefix(guildId) {
    return await this.commandManager.getServerPrefix(guildId);
  }

  /**
   * Set role permission for a command
   * 
   * @param {string} guildId - Guild ID
   * @param {string} commandName - Command name
   * @param {string} roleId - Role ID
   * @param {boolean} allowed - Whether the role is allowed
   * @returns {Promise<boolean>} Success status
   */
  async setRolePermission(guildId, commandName, roleId, allowed) {
    return await this.permissionManager.setRolePermission(guildId, commandName, roleId, allowed);
  }

  /**
   * Remove role permission for a command
   * 
   * @param {string} guildId - Guild ID
   * @param {string} commandName - Command name
   * @param {string} roleId - Role ID
   * @returns {Promise<boolean>} Success status
   */
  async removeRolePermission(guildId, commandName, roleId) {
    return await this.permissionManager.removeRolePermission(guildId, commandName, roleId);
  }

  /**
   * Get guild permissions
   * 
   * @param {string} guildId - Guild ID
   * @returns {Object} Guild permissions
   */
  getGuildPermissions(guildId) {
    return this.permissionManager.getGuildPermissions(guildId);
  }

  /**
   * Set cooldown for a user and command
   * 
   * @param {string} userId - User ID
   * @param {string} commandName - Command name
   * @param {number} cooldown - Cooldown time in milliseconds
   * @returns {boolean} Success status
   */
  setCooldown(userId, commandName, cooldown) {
    return this.cooldownManager.setCooldown(userId, commandName, cooldown);
  }

  /**
   * Set global cooldown for a command
   * 
   * @param {string} commandName - Command name
   * @param {number} cooldown - Cooldown time in milliseconds
   * @returns {boolean} Success status
   */
  setGlobalCooldown(commandName, cooldown) {
    return this.cooldownManager.setGlobalCooldown(commandName, cooldown);
  }

  /**
   * Get cooldown information
   * 
   * @param {string} userId - User ID
   * @param {string} commandName - Command name
   * @returns {Object|null} Cooldown information
   */
  getCooldown(userId, commandName) {
    return this.cooldownManager.getCooldown(userId, commandName);
  }

  /**
   * Get user cooldowns
   * 
   * @param {string} userId - User ID
   * @returns {Object} User cooldowns
   */
  getUserCooldowns(userId) {
    return this.cooldownManager.getUserCooldowns(userId);
  }

  /**
   * Get commands for web dashboard
   * 
   * @param {string} guildId - Guild ID
   * @returns {Object} Command information
   */
  async getCommandsForDashboard(guildId) {
    return await this.commandManager.getCommandsForDashboard(guildId);
  }

  /**
   * Get system statistics
   * 
   * @returns {Object} System statistics
   */
  getStats() {
    return {
      commandManager: this.commandManager.getCommandStats(),
      registry: this.registry.getStats(),
      permissions: this.permissionManager.getStats(),
      cooldowns: this.cooldownManager.getStats(),
      executor: this.executor.getStats()
    };
  }

  /**
   * Get execution history
   * 
   * @param {Object} filters - Filter options
   * @returns {Array} Execution history
   */
  getExecutionHistory(filters = {}) {
    return this.executor.getExecutionHistory(filters);
  }

  /**
   * Get active executions
   * 
   * @returns {Array} Active executions
   */
  getActiveExecutions() {
    return this.executor.getActiveExecutions();
  }

  /**
   * Get permission audit log
   * 
   * @param {Object} filters - Filter options
   * @returns {Array} Audit log entries
   */
  getPermissionAuditLog(filters = {}) {
    return this.permissionManager.getAuditLog(filters);
  }

  /**
   * Reload all commands
   * 
   * @returns {Promise<boolean>} Success status
   */
  async reloadCommands() {
    return await this.commandManager.reloadCommands();
  }

  /**
   * Clear all data
   * 
   * @returns {boolean} Success status
   */
  clearAllData() {
    try {
      this.commandManager.clearAllCooldowns();
      this.executor.clearAllData();
      this.permissionManager.clearAuditLog();
      
      logger.info('🗑️ All commands system data cleared');
      return true;
    } catch (error) {
      logger.error('❌ Failed to clear all data:', error);
      return false;
    }
  }

  /**
   * Get system health status
   * 
   * @returns {Object} Health status
   */
  getHealthStatus() {
    return {
      status: 'healthy',
      components: {
        commandManager: 'operational',
        registry: 'operational',
        permissionManager: 'operational',
        cooldownManager: 'operational',
        executor: 'operational'
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date()
    };
  }
}

// Create and export singleton instance
const commandsSystem = new CommandsSystem();

module.exports = commandsSystem; 