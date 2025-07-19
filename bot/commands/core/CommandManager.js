/**
 * @fileoverview Command Manager - Core Command Orchestration System
 * 
 * Central command management system for the Syro Discord bot.
 * Handles command registration, execution, prefix management, and category organization.
 * Provides a scalable foundation for dynamic command management and web dashboard integration.
 * 
 * Features:
 * - Dynamic command registration and execution
 * - Prefix management with per-server customization
 * - Category-based command organization
 * - Performance optimization with caching
 * - Comprehensive error handling and logging
 * - Web dashboard integration support
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const { Collection } = require('discord.js');
const logger = require('../../utils/logger');
const CommandRegistry = require('./CommandRegistry');
const PermissionManager = require('./PermissionManager');
const CooldownManager = require('./CooldownManager');
const CommandExecutor = require('./CommandExecutor');

/**
 * Command Manager Class
 * 
 * Main orchestrator for all bot commands. Manages command lifecycle,
 * execution flow, and integration with external systems.
 * 
 * @class CommandManager
 */
class CommandManager {
  /**
   * Initialize the Command Manager
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.defaultPrefix - Default command prefix
   * @param {boolean} options.enableCaching - Enable command caching
   * @param {number} options.cacheTTL - Cache time-to-live in milliseconds
   */
  constructor(options = {}) {
    this.defaultPrefix = options.defaultPrefix || 'x';
    this.enableCaching = options.enableCaching !== false;
    this.cacheTTL = options.cacheTTL || 300000; // 5 minutes
    
    // Core components
    this.registry = new CommandRegistry();
    this.permissionManager = new PermissionManager();
    this.cooldownManager = new CooldownManager();
    this.executor = new CommandExecutor();
    
    // Command storage
    this.commands = new Collection();
    this.categories = new Collection();
    this.aliases = new Collection();
    
    // Server-specific settings cache
    this.serverSettings = new Collection();
    this.prefixCache = new Collection();
    
    // Performance tracking
    this.executionStats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0
    };
    
    // Initialize the system
    this._initialize();
  }

  /**
   * Initialize the command manager system
   * 
   * @private
   */
  _initialize() {
    try {
      logger.info('🔧 Initializing Command Manager...');
      
      // Setup event listeners for cache invalidation
      this._setupCacheInvalidation();
      
      // Load default categories
      this._loadDefaultCategories();
      
      logger.info('✅ Command Manager initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Command Manager:', error);
      throw error;
    }
  }

  /**
   * Setup cache invalidation listeners
   * 
   * @private
   */
  _setupCacheInvalidation() {
    // Invalidate cache when server settings change
    setInterval(() => {
      this.prefixCache.clear();
      logger.debug('🔄 Command cache cleared');
    }, this.cacheTTL);
  }

  /**
   * Load default command categories
   * 
   * @private
   */
  _loadDefaultCategories() {
    const defaultCategories = [
      'admin',
      'moderation', 
      'utility',
      'info',
      'fun',
      'economy',
      'music'
    ];

    defaultCategories.forEach(category => {
      this.categories.set(category, {
        name: category.charAt(0).toUpperCase() + category.slice(1),
        description: `${category} commands`,
        commands: new Collection(),
        enabled: true,
        allowedRoles: []
      });
    });
  }

  /**
   * Register a new command
   * 
   * @param {Object} command - Command configuration object
   * @param {string} command.name - Command name
   * @param {string} command.description - Command description
   * @param {string} command.category - Command category
   * @param {Array} command.permissions - Required permissions
   * @param {number} command.cooldown - Cooldown in milliseconds
   * @param {Array} command.aliases - Command aliases
   * @param {Function} command.execute - Command execution function
   * @returns {boolean} Success status
   */
  registerCommand(command) {
    try {
      // Validate command structure
      if (!this._validateCommand(command)) {
        logger.error(`❌ Invalid command structure for: ${command.name}`);
        return false;
      }

      // Check for conflicts
      if (this.commands.has(command.name)) {
        logger.warn(`⚠️ Command already exists: ${command.name}`);
        return false;
      }

      // Register command in registry
      this.registry.register(command);

      // Add to main collection
      this.commands.set(command.name, {
        ...command,
        registeredAt: new Date(),
        usageCount: 0,
        lastUsed: null
      });

      // Add to category
      if (this.categories.has(command.category)) {
        this.categories.get(command.category).commands.set(command.name, command);
      }

      // Register aliases
      if (command.aliases && Array.isArray(command.aliases)) {
        command.aliases.forEach(alias => {
          this.aliases.set(alias, command.name);
        });
      }

      logger.info(`✅ Command registered: ${command.name} (${command.category})`);
      return true;

    } catch (error) {
      logger.error(`❌ Failed to register command ${command.name}:`, error);
      return false;
    }
  }

  /**
   * Validate command structure
   * 
   * @param {Object} command - Command to validate
   * @returns {boolean} Validation result
   * @private
   */
  _validateCommand(command) {
    const requiredFields = ['name', 'description', 'category', 'execute'];
    
    for (const field of requiredFields) {
      if (!command[field]) {
        logger.error(`❌ Missing required field: ${field}`);
        return false;
      }
    }

    if (typeof command.execute !== 'function') {
      logger.error('❌ Execute must be a function');
      return false;
    }

    if (!this.categories.has(command.category)) {
      logger.error(`❌ Invalid category: ${command.category}`);
      return false;
    }

    return true;
  }

  /**
   * Execute a command from a message
   * 
   * @param {Message} message - Discord message object
   * @returns {Promise<boolean>} Execution success status
   */
  async executeCommand(message) {
    const startTime = Date.now();
    
    try {
      // Ignore bot messages
      if (message.author.bot) return false;

      // Get server prefix
      const prefix = await this.getServerPrefix(message.guild.id);
      
      // Check if message starts with prefix
      if (!message.content.startsWith(prefix)) return false;

      // Extract command and arguments
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      // Find command (check aliases)
      const command = this.commands.get(commandName) || 
                     this.commands.get(this.aliases.get(commandName));

      if (!command) return false;

      // Update usage statistics
      this._updateUsageStats(command.name);

      // Check permissions
      const hasPermission = await this.permissionManager.checkPermission(
        message.member, 
        command, 
        message.guild
      );

      if (!hasPermission) {
        await message.reply('❌ You do not have permission to use this command.');
        return false;
      }

      // Check cooldown
      const cooldownResult = await this.cooldownManager.checkCooldown(
        message.author.id,
        command.name,
        command.cooldown
      );

      if (!cooldownResult.allowed) {
        const remainingTime = Math.ceil(cooldownResult.remainingTime / 1000);
        await message.reply(`⏰ Please wait ${remainingTime} seconds before using this command again.`);
        return false;
      }

      // Execute command
      const result = await this.executor.execute(message, command, args);
      
      // Update execution statistics
      this._updateExecutionStats(true, Date.now() - startTime);

      return result;

    } catch (error) {
      logger.error('❌ Command execution error:', error);
      
      // Update execution statistics
      this._updateExecutionStats(false, Date.now() - startTime);
      
      // Send error message to user
      try {
        await message.reply('❌ An error occurred while executing the command.');
      } catch (replyError) {
        logger.error('❌ Failed to send error message:', replyError);
      }

      return false;
    }
  }

  /**
   * Get server-specific prefix
   * 
   * @param {string} guildId - Guild ID
   * @returns {Promise<string>} Server prefix
   */
  async getServerPrefix(guildId) {
    try {
      // Check cache first
      if (this.prefixCache.has(guildId)) {
        return this.prefixCache.get(guildId);
      }

      // TODO: Load from database when ServerSettings model is implemented
      // For now, return default prefix
      const prefix = this.defaultPrefix;
      
      // Cache the result
      this.prefixCache.set(guildId, prefix);
      
      return prefix;

    } catch (error) {
      logger.error(`❌ Error getting prefix for guild ${guildId}:`, error);
      return this.defaultPrefix;
    }
  }

  /**
   * Set server-specific prefix
   * 
   * @param {string} guildId - Guild ID
   * @param {string} prefix - New prefix
   * @returns {Promise<boolean>} Success status
   */
  async setServerPrefix(guildId, prefix) {
    try {
      // Validate prefix
      if (!prefix || prefix.length > 5) {
        logger.error(`❌ Invalid prefix: ${prefix}`);
        return false;
      }

      // TODO: Save to database when ServerSettings model is implemented
      
      // Update cache
      this.prefixCache.set(guildId, prefix);
      
      logger.info(`✅ Prefix updated for guild ${guildId}: ${prefix}`);
      return true;

    } catch (error) {
      logger.error(`❌ Error setting prefix for guild ${guildId}:`, error);
      return false;
    }
  }

  /**
   * Get commands by category
   * 
   * @param {string} category - Category name
   * @returns {Collection} Commands in category
   */
  getCommandsByCategory(category) {
    if (!this.categories.has(category)) {
      return new Collection();
    }
    
    return this.categories.get(category).commands;
  }

  /**
   * Get all categories
   * 
   * @returns {Collection} All categories
   */
  getAllCategories() {
    return this.categories;
  }

  /**
   * Get command statistics
   * 
   * @returns {Object} Command statistics
   */
  getCommandStats() {
    return {
      totalCommands: this.commands.size,
      totalCategories: this.categories.size,
      totalAliases: this.aliases.size,
      executionStats: this.executionStats,
      categories: Array.from(this.categories.values()).map(cat => ({
        name: cat.name,
        commandCount: cat.commands.size,
        enabled: cat.enabled
      }))
    };
  }

  /**
   * Update command usage statistics
   * 
   * @param {string} commandName - Command name
   * @private
   */
  _updateUsageStats(commandName) {
    const command = this.commands.get(commandName);
    if (command) {
      command.usageCount++;
      command.lastUsed = new Date();
    }
  }

  /**
   * Update execution statistics
   * 
   * @param {boolean} success - Execution success
   * @param {number} executionTime - Execution time in milliseconds
   * @private
   */
  _updateExecutionStats(success, executionTime) {
    this.executionStats.totalExecutions++;
    
    if (success) {
      this.executionStats.successfulExecutions++;
    } else {
      this.executionStats.failedExecutions++;
    }

    // Update average execution time
    const currentAvg = this.executionStats.averageExecutionTime;
    const totalExecutions = this.executionStats.totalExecutions;
    this.executionStats.averageExecutionTime = 
      (currentAvg * (totalExecutions - 1) + executionTime) / totalExecutions;
  }

  /**
   * Unregister a command
   * 
   * @param {string} commandName - Command name to unregister
   * @returns {boolean} Success status
   */
  unregisterCommand(commandName) {
    try {
      const command = this.commands.get(commandName);
      if (!command) {
        logger.warn(`⚠️ Command not found: ${commandName}`);
        return false;
      }

      // Remove from registry
      this.registry.unregister(commandName);

      // Remove from main collection
      this.commands.delete(commandName);

      // Remove from category
      if (this.categories.has(command.category)) {
        this.categories.get(command.category).commands.delete(commandName);
      }

      // Remove aliases
      if (command.aliases) {
        command.aliases.forEach(alias => {
          this.aliases.delete(alias);
        });
      }

      logger.info(`✅ Command unregistered: ${commandName}`);
      return true;

    } catch (error) {
      logger.error(`❌ Failed to unregister command ${commandName}:`, error);
      return false;
    }
  }

  /**
   * Reload all commands
   * 
   * @returns {Promise<boolean>} Success status
   */
  async reloadCommands() {
    try {
      logger.info('🔄 Reloading all commands...');
      
      // Clear all collections
      this.commands.clear();
      this.aliases.clear();
      
      // Reset categories
      this.categories.forEach(category => {
        category.commands.clear();
      });

      // TODO: Reload commands from filesystem when file loading is implemented
      
      logger.info('✅ Commands reloaded successfully');
      return true;

    } catch (error) {
      logger.error('❌ Failed to reload commands:', error);
      return false;
    }
  }

  /**
   * Get command information for web dashboard
   * 
   * @param {string} guildId - Guild ID
   * @returns {Object} Command information
   */
  async getCommandsForDashboard(guildId) {
    try {
      const commands = [];
      
      for (const [name, command] of this.commands) {
        const category = this.categories.get(command.category);
        
        commands.push({
          name,
          description: command.description,
          category: command.category,
          categoryName: category ? category.name : command.category,
          permissions: command.permissions || [],
          cooldown: command.cooldown || 0,
          aliases: command.aliases || [],
          usageCount: command.usageCount || 0,
          lastUsed: command.lastUsed,
          enabled: category ? category.enabled : true
        });
      }

      return commands;

    } catch (error) {
      logger.error(`❌ Error getting commands for dashboard (guild ${guildId}):`, error);
      return [];
    }
  }
}

module.exports = CommandManager; 