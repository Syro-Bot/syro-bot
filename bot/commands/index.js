/**
 * @fileoverview Commands System - Main Entry Point
 * 
 * Main entry point for the bot's command system. Integrates all command
 * categories and provides a unified interface for command management.
 * 
 * Features:
 * - Automatic category loading
 * - Command registration and management
 * - Legacy command integration
 * - Statistics and monitoring
 * 
 * @author Syro Backend Team
 * @version 2.0.0
 * @since 2024
 * @license MIT
 */

const CommandManager = require('./core/CommandManager');
const CommandRegistry = require('./core/CommandRegistry');
const PermissionManager = require('./core/PermissionManager');
const CooldownManager = require('./core/CooldownManager');
const CommandExecutor = require('./core/CommandExecutor');
const logger = require('../utils/logger');

// Import command categories
const AdminCommands = require('./categories/admin');
const UtilityCommands = require('./categories/utility');

/**
 * Commands System Class
 * 
 * Main orchestrator for the bot's command system.
 * Manages all command categories and provides unified access.
 * 
 * @class CommandsSystem
 */
class CommandsSystem {
  constructor() {
    this.commandManager = new CommandManager();
    this.commandRegistry = new CommandRegistry();
    this.permissionManager = new PermissionManager();
    this.cooldownManager = new CooldownManager();
    this.commandExecutor = new CommandExecutor();
    
    this.categories = new Map();
    this.legacyCommands = new Map();
    
    logger.info('🚀 Commands system initialized');
  }

  /**
   * Initialize the commands system
   * 
   * @param {Client} client - Discord client
   * @returns {Promise<void>}
   */
  async initialize(client) {
    try {
      // Load command categories
      await this._loadCategories();
      
      // Register all commands
      await this._registerCommands();
      
      // Initialize managers
      await this._initializeManagers(client);
      
      logger.info('✅ Commands system fully initialized');
      
    } catch (error) {
      logger.error('❌ Failed to initialize commands system:', error);
      throw error;
    }
  }

  /**
   * Load all command categories
   * 
   * @private
   */
  async _loadCategories() {
    logger.info('📦 Loading command categories...');
    
    // Load admin commands
    this.categories.set('admin', AdminCommands);
    logger.debug(`📁 Loaded admin category with ${Object.keys(AdminCommands).filter(key => key !== 'metadata').length} commands`);
    
    // Load utility commands
    this.categories.set('utility', UtilityCommands);
    logger.debug(`📁 Loaded utility category with ${Object.keys(UtilityCommands).filter(key => key !== 'metadata').length} commands`);
    
    logger.info(`✅ Loaded ${this.categories.size} command categories`);
  }

  /**
   * Register all commands with the system
   * 
   * @private
   */
  async _registerCommands() {
    logger.info('📝 Registering commands...');
    
    let totalCommands = 0;
    
    for (const [categoryName, category] of this.categories) {
      console.log(`🔍 Processing category: ${categoryName}`);
      console.log(`📁 Category keys: ${Object.keys(category).join(', ')}`);
      
      const categoryMetadata = category.metadata;
      
      for (const [commandName, command] of Object.entries(category)) {
        if (commandName === 'metadata') continue;
        
        console.log(`🔍 Processing command: ${commandName}`);
        console.log(`📝 Command type: ${typeof command}`);
        console.log(`📝 Command constructor: ${command.constructor.name}`);
        
        try {
          // Get command metadata
          const metadata = command.getMetadata();
          console.log(`✅ Got metadata for ${commandName}:`, metadata.name);
          
          // Create command object with execute method
          const commandObject = {
            ...metadata,
            execute: (message, args) => command.execute(message, args)
          };
          
          // Register command
          this.commandRegistry.register(commandObject);
          console.log(`✅ Registered command: ${commandName} (${categoryName})`);
          
          // Register aliases
          if (metadata.aliases && metadata.aliases.length > 0) {
            for (const alias of metadata.aliases) {
              this.commandRegistry.addAlias(commandName, alias);
              console.log(`📝 Registered alias: ${alias} -> ${commandName}`);
            }
          }
          
          totalCommands++;
          
        } catch (error) {
          console.error(`❌ Failed to register command ${commandName}:`, error);
          logger.error(`❌ Failed to register command ${commandName}:`, error);
        }
      }
    }
    
    console.log(`✅ Registered ${totalCommands} commands total`);
    logger.info(`✅ Registered ${totalCommands} commands`);
  }

  /**
   * Initialize command managers
   * 
   * @param {Client} client - Discord client
   * @private
   */
  async _initializeManagers(client) {
    // Set client references for all managers
    this.commandManager.client = client;
    this.permissionManager.client = client;
    this.cooldownManager.client = client;
    this.commandExecutor.client = client;
    
    logger.info('✅ Command managers initialized');
  }

  /**
   * Execute a command
   * 
   * @param {Message} message - Discord message
   * @param {string} commandName - Command name
   * @param {Array} args - Command arguments
   * @returns {Promise<boolean>} Execution success
   */
  async executeCommand(message, commandName, args) {
    try {
      logger.debug(`🔍 Looking for command: ${commandName}`);
      
      // Find command in registry
      const command = this.commandRegistry.get(commandName);
      if (!command) {
        logger.debug(`❌ Command not found: ${commandName}`);
        return false;
      }
      
      logger.debug(`✅ Command found: ${commandName}, executing...`);
      
      // Execute command
      return await this.commandExecutor.execute(message, command, args);
      
    } catch (error) {
      logger.error(`❌ Error executing command ${commandName}:`, error);
      return false;
    }
  }

  /**
   * Get command statistics
   * 
   * @returns {Object} Command statistics
   */
  getStats() {
    const stats = {
      categories: this.categories.size,
      totalCommands: 0,
      categoryStats: {},
      systemStats: {
        registry: this.commandRegistry.getStats(),
        permissions: this.permissionManager.getStats(),
        cooldowns: this.cooldownManager.getStats(),
        executor: this.commandExecutor.getStats()
      }
    };
    
    // Calculate category statistics
    for (const [categoryName, category] of this.categories) {
      const commandCount = Object.keys(category).filter(key => key !== 'metadata').length;
      stats.totalCommands += commandCount;
      
      stats.categoryStats[categoryName] = {
        name: category.metadata.name,
        description: category.metadata.description,
        commandCount,
        color: category.metadata.color,
        icon: category.metadata.icon
      };
    }
    
    return stats;
  }

  /**
   * Get help information for commands
   * 
   * @param {string} category - Category filter (optional)
   * @param {string} command - Command filter (optional)
   * @returns {Object} Help information
   */
  getHelp(category = null, command = null) {
    if (command) {
      // Get specific command help
      const cmd = this.commandRegistry.get(command);
      return cmd ? cmd.getHelp() : null;
    }
    
    if (category) {
      // Get category help
      const cat = this.categories.get(category);
      if (!cat) return null;
      
      const commands = [];
      for (const [commandName, command] of Object.entries(cat)) {
        if (commandName === 'metadata') continue;
        commands.push(command.getHelp());
      }
      
      return {
        category: cat.metadata,
        commands
      };
    }
    
    // Get all help
    const categories = [];
    for (const [categoryName, category] of this.categories) {
      const commands = [];
      for (const [commandName, command] of Object.entries(category)) {
        if (commandName === 'metadata') continue;
        commands.push(command.getHelp());
      }
      
      categories.push({
        category: category.metadata,
        commands
      });
    }
    
    return { categories };
  }

  /**
   * Register legacy commands for backward compatibility
   * 
   * @param {Object} legacyCommands - Legacy command objects
   */
  registerLegacyCommands(legacyCommands) {
    logger.info('🔄 Registering legacy commands...');
    
    for (const [commandName, command] of Object.entries(legacyCommands)) {
      this.legacyCommands.set(commandName, command);
      logger.debug(`🔄 Registered legacy command: ${commandName}`);
    }
    
    logger.info(`✅ Registered ${this.legacyCommands.size} legacy commands`);
  }

  /**
   * Execute legacy command
   * 
   * @param {Message} message - Discord message
   * @param {string} commandName - Command name
   * @param {Array} args - Command arguments
   * @returns {Promise<boolean>} Execution success
   */
  async executeLegacyCommand(message, commandName, args) {
    const legacyCommand = this.legacyCommands.get(commandName);
    if (!legacyCommand) {
      return false;
    }
    
    try {
      // Execute legacy command
      await legacyCommand.execute(message, args);
      return true;
    } catch (error) {
      logger.error(`❌ Error executing legacy command ${commandName}:`, error);
      return false;
    }
  }

  /**
   * Check if command exists (new or legacy)
   * 
   * @param {string} commandName - Command name
   * @returns {boolean} Command exists
   */
  hasCommand(commandName) {
    return this.commandRegistry.has(commandName) || this.legacyCommands.has(commandName);
  }

  /**
   * Get all command names
   * 
   * @returns {Array} Command names
   */
  getAllCommandNames() {
    const newCommands = Array.from(this.commandRegistry.getAll().keys());
    const legacyCommands = Array.from(this.legacyCommands.keys());
    return [...new Set([...newCommands, ...legacyCommands])];
  }

  /**
   * Debug: List all registered commands
   * 
   * @returns {Object} Debug information
   */
  debugCommands() {
    const newCommands = Array.from(this.commandRegistry.getAll().keys());
    const legacyCommands = Array.from(this.legacyCommands.keys());
    
    logger.info('🔍 DEBUG: Registered Commands');
    logger.info(`📝 New System Commands: ${newCommands.join(', ')}`);
    logger.info(`🔄 Legacy Commands: ${legacyCommands.join(', ')}`);
    
    return {
      newCommands,
      legacyCommands,
      totalNew: newCommands.length,
      totalLegacy: legacyCommands.length
    };
  }

  /**
   * Reload command categories
   * 
   * @returns {Promise<void>}
   */
  async reloadCategories() {
    logger.info('🔄 Reloading command categories...');
    
    // Clear existing categories
    this.categories.clear();
    this.commandRegistry.clear();
    
    // Reload categories
    await this._loadCategories();
    await this._registerCommands();
    
    logger.info('✅ Command categories reloaded');
  }

  /**
   * Get command manager instance
   * 
   * @returns {CommandManager} Command manager
   */
  getCommandManager() {
    return this.commandManager;
  }

  /**
   * Get command registry instance
   * 
   * @returns {CommandRegistry} Command registry
   */
  getCommandRegistry() {
    return this.commandRegistry;
  }

  /**
   * Get permission manager instance
   * 
   * @returns {PermissionManager} Permission manager
   */
  getPermissionManager() {
    return this.permissionManager;
  }

  /**
   * Get cooldown manager instance
   * 
   * @returns {CooldownManager} Cooldown manager
   */
  getCooldownManager() {
    return this.cooldownManager;
  }

  /**
   * Get command executor instance
   * 
   * @returns {CommandExecutor} Command executor
   */
  getCommandExecutor() {
    return this.commandExecutor;
  }
}

// Create and export singleton instance
const commandsSystem = new CommandsSystem();

module.exports = commandsSystem; 