/**
 * @fileoverview Command Registry - Command Registration and Management System
 * 
 * Central registry for managing all bot commands. Provides efficient command lookup,
 * registration, and management capabilities with support for aliases and categories.
 * 
 * Features:
 * - Fast command lookup with O(1) complexity
 * - Alias management and resolution
 * - Category-based organization
 * - Command metadata tracking
 * - Registration validation and conflict detection
 * - Performance monitoring and statistics
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const { Collection } = require('discord.js');
const logger = require('../../utils/logger');

/**
 * Command Registry Class
 * 
 * Manages command registration, lookup, and metadata tracking.
 * Provides efficient access to commands with support for aliases and categories.
 * 
 * @class CommandRegistry
 */
class CommandRegistry {
  /**
   * Initialize the Command Registry
   * 
   * @param {Object} options - Configuration options
   * @param {boolean} options.enableValidation - Enable command validation
   * @param {boolean} options.enableStatistics - Enable usage statistics
   * @param {number} options.maxAliases - Maximum aliases per command
   */
  constructor(options = {}) {
    this.enableValidation = options.enableValidation !== false;
    this.enableStatistics = options.enableStatistics !== false;
    this.maxAliases = options.maxAliases || 10;
    
    // Command storage
    this.commands = new Collection();
    this.aliases = new Collection();
    this.categories = new Collection();
    
    // Metadata tracking
    this.metadata = {
      totalCommands: 0,
      totalAliases: 0,
      totalCategories: 0,
      registrationHistory: [],
      conflicts: []
    };
    
    // Performance tracking
    this.performance = {
      lookupCount: 0,
      averageLookupTime: 0,
      totalLookupTime: 0
    };
    
    // Initialize the registry
    this._initialize();
  }

  /**
   * Initialize the command registry
   * 
   * @private
   */
  _initialize() {
    try {
      logger.info('📋 Initializing Command Registry...');
      
      // Setup performance monitoring
      this._setupPerformanceMonitoring();
      
      logger.info('✅ Command Registry initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Command Registry:', error);
      throw error;
    }
  }

  /**
   * Setup performance monitoring
   * 
   * @private
   */
  _setupPerformanceMonitoring() {
    // Reset performance stats every hour
    setInterval(() => {
      this.performance.lookupCount = 0;
      this.performance.totalLookupTime = 0;
      this.performance.averageLookupTime = 0;
      logger.debug('🔄 Command Registry performance stats reset');
    }, 3600000); // 1 hour
  }

  /**
   * Register a command in the registry
   * 
   * @param {Object} command - Command object to register
   * @param {string} command.name - Command name
   * @param {string} command.description - Command description
   * @param {string} command.category - Command category
   * @param {Array} command.aliases - Command aliases
   * @param {Function} command.execute - Command execution function
   * @returns {boolean} Registration success status
   */
  register(command) {
    const startTime = Date.now();
    
    try {
      // Validate command structure
      if (this.enableValidation && !this._validateCommand(command)) {
        logger.error(`❌ Command validation failed: ${command.name}`);
        return false;
      }

      // Check for conflicts
      if (this._hasConflicts(command)) {
        logger.warn(`⚠️ Command conflicts detected: ${command.name}`);
        return false;
      }

      // Register command
      this.commands.set(command.name, {
        ...command,
        registeredAt: new Date(),
        lastModified: new Date(),
        usageCount: 0,
        metadata: this._generateMetadata(command)
      });

      // Register aliases
      if (command.aliases && Array.isArray(command.aliases)) {
        this._registerAliases(command.name, command.aliases);
      }

      // Register in category
      this._registerInCategory(command);

      // Update metadata
      this._updateMetadata('register', command.name);

      const registrationTime = Date.now() - startTime;
      logger.info(`✅ Command registered: ${command.name} (${registrationTime}ms)`);

      return true;

    } catch (error) {
      logger.error(`❌ Failed to register command ${command.name}:`, error);
      return false;
    }
  }

  /**
   * Unregister a command from the registry
   * 
   * @param {string} commandName - Name of command to unregister
   * @returns {boolean} Unregistration success status
   */
  unregister(commandName) {
    try {
      const command = this.commands.get(commandName);
      if (!command) {
        logger.warn(`⚠️ Command not found for unregistration: ${commandName}`);
        return false;
      }

      // Remove command
      this.commands.delete(commandName);

      // Remove aliases
      if (command.aliases) {
        command.aliases.forEach(alias => {
          this.aliases.delete(alias);
        });
      }

      // Remove from category
      if (command.category && this.categories.has(command.category)) {
        this.categories.get(command.category).commands.delete(commandName);
      }

      // Update metadata
      this._updateMetadata('unregister', commandName);

      logger.info(`✅ Command unregistered: ${commandName}`);
      return true;

    } catch (error) {
      logger.error(`❌ Failed to unregister command ${commandName}:`, error);
      return false;
    }
  }

  /**
   * Get a command by name or alias
   * 
   * @param {string} identifier - Command name or alias
   * @returns {Object|null} Command object or null if not found
   */
  get(identifier) {
    const startTime = Date.now();
    
    try {
      // Direct lookup
      let command = this.commands.get(identifier);
      
      if (!command) {
        // Alias lookup
        const actualName = this.aliases.get(identifier);
        if (actualName) {
          command = this.commands.get(actualName);
        }
      }

      // Update performance stats
      this._updatePerformanceStats(Date.now() - startTime);

      return command || null;

    } catch (error) {
      logger.error(`❌ Error looking up command ${identifier}:`, error);
      return null;
    }
  }

  /**
   * Get all registered commands
   * 
   * @returns {Collection} All registered commands
   */
  getAll() {
    return this.commands;
  }

  /**
   * Get commands by category
   * 
   * @param {string} category - Category name
   * @returns {Collection} Commands in category
   */
  getByCategory(category) {
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
  getCategories() {
    return this.categories;
  }

  /**
   * Check if a command exists
   * 
   * @param {string} identifier - Command name or alias
   * @returns {boolean} Command existence status
   */
  has(identifier) {
    return this.commands.has(identifier) || this.aliases.has(identifier);
  }

  /**
   * Get command aliases
   * 
   * @param {string} commandName - Command name
   * @returns {Array} Array of aliases
   */
  getAliases(commandName) {
    const aliases = [];
    
    for (const [alias, name] of this.aliases) {
      if (name === commandName) {
        aliases.push(alias);
      }
    }
    
    return aliases;
  }

  /**
   * Add alias to existing command
   * 
   * @param {string} commandName - Command name
   * @param {string} alias - Alias to add
   * @returns {boolean} Success status
   */
  addAlias(commandName, alias) {
    try {
      if (!this.commands.has(commandName)) {
        logger.error(`❌ Command not found: ${commandName}`);
        return false;
      }

      if (this.aliases.has(alias)) {
        logger.warn(`⚠️ Alias already exists: ${alias}`);
        return false;
      }

      if (this.commands.has(alias)) {
        logger.warn(`⚠️ Alias conflicts with existing command: ${alias}`);
        return false;
      }

      this.aliases.set(alias, commandName);
      this.metadata.totalAliases++;
      
      logger.info(`✅ Alias added: ${alias} -> ${commandName}`);
      return true;

    } catch (error) {
      logger.error(`❌ Failed to add alias ${alias}:`, error);
      return false;
    }
  }

  /**
   * Remove alias from command
   * 
   * @param {string} alias - Alias to remove
   * @returns {boolean} Success status
   */
  removeAlias(alias) {
    try {
      if (!this.aliases.has(alias)) {
        logger.warn(`⚠️ Alias not found: ${alias}`);
        return false;
      }

      this.aliases.delete(alias);
      this.metadata.totalAliases--;
      
      logger.info(`✅ Alias removed: ${alias}`);
      return true;

    } catch (error) {
      logger.error(`❌ Failed to remove alias ${alias}:`, error);
      return false;
    }
  }

  /**
   * Get registry statistics
   * 
   * @returns {Object} Registry statistics
   */
  getStats() {
    return {
      commands: {
        total: this.commands.size,
        byCategory: this._getCategoryStats()
      },
      aliases: {
        total: this.aliases.size,
        averagePerCommand: this.commands.size > 0 ? 
          (this.aliases.size / this.commands.size).toFixed(2) : 0
      },
      performance: {
        ...this.performance,
        averageLookupTime: this.performance.averageLookupTime.toFixed(2)
      },
      metadata: {
        ...this.metadata,
        lastRegistration: this.metadata.registrationHistory.length > 0 ?
          this.metadata.registrationHistory[this.metadata.registrationHistory.length - 1] : null
      }
    };
  }

  /**
   * Clear all commands from registry
   * 
   * @returns {boolean} Success status
   */
  clear() {
    try {
      this.commands.clear();
      this.aliases.clear();
      this.categories.clear();
      
      // Reset metadata
      this.metadata.totalCommands = 0;
      this.metadata.totalAliases = 0;
      this.metadata.totalCategories = 0;
      this.metadata.registrationHistory = [];
      this.metadata.conflicts = [];
      
      logger.info('🗑️ Command Registry cleared');
      return true;

    } catch (error) {
      logger.error('❌ Failed to clear Command Registry:', error);
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

    if (command.aliases && !Array.isArray(command.aliases)) {
      logger.error('❌ Aliases must be an array');
      return false;
    }

    if (command.aliases && command.aliases.length > this.maxAliases) {
      logger.error(`❌ Too many aliases (max: ${this.maxAliases})`);
      return false;
    }

    return true;
  }

  /**
   * Check for command conflicts
   * 
   * @param {Object} command - Command to check
   * @returns {boolean} Conflict status
   * @private
   */
  _hasConflicts(command) {
    // Check if command name already exists
    if (this.commands.has(command.name)) {
      this.metadata.conflicts.push({
        type: 'duplicate_name',
        command: command.name,
        timestamp: new Date()
      });
      return true;
    }

    // Check if aliases conflict
    if (command.aliases) {
      for (const alias of command.aliases) {
        if (this.commands.has(alias) || this.aliases.has(alias)) {
          this.metadata.conflicts.push({
            type: 'alias_conflict',
            alias,
            command: command.name,
            timestamp: new Date()
          });
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Register command aliases
   * 
   * @param {string} commandName - Command name
   * @param {Array} aliases - Aliases to register
   * @private
   */
  _registerAliases(commandName, aliases) {
    aliases.forEach(alias => {
      this.aliases.set(alias, commandName);
      this.metadata.totalAliases++;
    });
  }

  /**
   * Register command in category
   * 
   * @param {Object} command - Command to register
   * @private
   */
  _registerInCategory(command) {
    if (!this.categories.has(command.category)) {
      this.categories.set(command.category, {
        name: command.category,
        commands: new Collection(),
        description: `${command.category} commands`
      });
      this.metadata.totalCategories++;
    }

    this.categories.get(command.category).commands.set(command.name, command);
  }

  /**
   * Generate command metadata
   * 
   * @param {Object} command - Command object
   * @returns {Object} Generated metadata
   * @private
   */
  _generateMetadata(command) {
    return {
      hash: this._generateHash(command),
      size: JSON.stringify(command).length,
      complexity: this._calculateComplexity(command),
      dependencies: this._extractDependencies(command)
    };
  }

  /**
   * Generate hash for command
   * 
   * @param {Object} command - Command object
   * @returns {string} Command hash
   * @private
   */
  _generateHash(command) {
    const crypto = require('crypto');
    const content = JSON.stringify({
      name: command.name,
      description: command.description,
      category: command.category,
      aliases: command.aliases || []
    });
    
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Calculate command complexity
   * 
   * @param {Object} command - Command object
   * @returns {number} Complexity score
   * @private
   */
  _calculateComplexity(command) {
    let complexity = 1;
    
    if (command.aliases && command.aliases.length > 0) complexity += 0.5;
    if (command.permissions && command.permissions.length > 0) complexity += 0.5;
    if (command.cooldown && command.cooldown > 0) complexity += 0.5;
    
    return complexity;
  }

  /**
   * Extract command dependencies
   * 
   * @param {Object} command - Command object
   * @returns {Array} Dependencies array
   * @private
   */
  _extractDependencies(command) {
    const dependencies = [];
    
    if (command.permissions) dependencies.push('permissions');
    if (command.cooldown) dependencies.push('cooldown');
    if (command.aliases) dependencies.push('aliases');
    
    return dependencies;
  }

  /**
   * Update metadata
   * 
   * @param {string} action - Action performed
   * @param {string} commandName - Command name
   * @private
   */
  _updateMetadata(action, commandName) {
    this.metadata.registrationHistory.push({
      action,
      command: commandName,
      timestamp: new Date()
    });

    if (action === 'register') {
      this.metadata.totalCommands++;
    } else if (action === 'unregister') {
      this.metadata.totalCommands--;
    }
  }

  /**
   * Update performance statistics
   * 
   * @param {number} lookupTime - Lookup time in milliseconds
   * @private
   */
  _updatePerformanceStats(lookupTime) {
    this.performance.lookupCount++;
    this.performance.totalLookupTime += lookupTime;
    this.performance.averageLookupTime = 
      this.performance.totalLookupTime / this.performance.lookupCount;
  }

  /**
   * Get category statistics
   * 
   * @returns {Object} Category statistics
   * @private
   */
  _getCategoryStats() {
    const stats = {};
    
    for (const [category, data] of this.categories) {
      stats[category] = data.commands.size;
    }
    
    return stats;
  }
}

module.exports = CommandRegistry; 