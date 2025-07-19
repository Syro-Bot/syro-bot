/**
 * @fileoverview Base Command - Abstract Command Class
 * 
 * Abstract base class for all bot commands. Provides common functionality,
 * validation, error handling, and utility methods for command development.
 * 
 * Features:
 * - Automatic structure validation
 * - Standardized error handling
 * - Built-in logging and statistics
 * - Automatic cooldown management
 * - Permission validation
 * - Help text generation
 * - Argument parsing and validation
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const logger = require('../../utils/logger');

/**
 * Base Command Class
 * 
 * Abstract base class that all commands should extend.
 * Provides common functionality and enforces consistent structure.
 * 
 * @abstract
 * @class BaseCommand
 */
class BaseCommand {
  /**
   * Initialize the base command
   * 
   * @param {Object} config - Command configuration
   * @param {string} config.name - Command name
   * @param {string} config.description - Command description
   * @param {string} config.category - Command category
   * @param {Array} config.permissions - Required permissions
   * @param {number} config.cooldown - Cooldown in milliseconds
   * @param {Array} config.aliases - Command aliases
   * @param {string} config.usage - Usage example
   * @param {Array} config.examples - Usage examples
   * @param {Object} config.args - Argument definitions
   * @param {boolean} config.guildOnly - Whether command is guild-only
   * @param {boolean} config.dmOnly - Whether command is DM-only
   * @param {Array} config.botPermissions - Required bot permissions
   */
  constructor(config) {
    // Validate required configuration
    this._validateConfig(config);
    
    // Set command properties
    this.name = config.name;
    this.description = config.description;
    this.category = config.category;
    this.permissions = config.permissions || [];
    this.cooldown = config.cooldown || 0;
    this.aliases = config.aliases || [];
    this.usage = config.usage || '';
    this.examples = config.examples || [];
    this.args = config.args || {};
    this.guildOnly = config.guildOnly || false;
    this.dmOnly = config.dmOnly || false;
    this.botPermissions = config.botPermissions || [];
    
    // Internal properties
    this._usageCount = 0;
    this._lastUsed = null;
    this._errors = 0;
    this._averageExecutionTime = 0;
    
    // Bind methods to preserve context
    this.execute = this.execute.bind(this);
    this.run = this.run.bind(this);
    
    logger.debug(`📝 Base command initialized: ${this.name}`);
  }

  /**
   * Validate command configuration
   * 
   * @param {Object} config - Command configuration
   * @private
   */
  _validateConfig(config) {
    const requiredFields = ['name', 'description', 'category'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (typeof config.name !== 'string' || config.name.length === 0) {
      throw new Error('Command name must be a non-empty string');
    }
    
    if (typeof config.description !== 'string' || config.description.length === 0) {
      throw new Error('Command description must be a non-empty string');
    }
    
    if (typeof config.category !== 'string' || config.category.length === 0) {
      throw new Error('Command category must be a non-empty string');
    }
    
    if (config.cooldown && (typeof config.cooldown !== 'number' || config.cooldown < 0)) {
      throw new Error('Cooldown must be a non-negative number');
    }
    
    if (config.aliases && !Array.isArray(config.aliases)) {
      throw new Error('Aliases must be an array');
    }
    
    if (config.permissions && !Array.isArray(config.permissions)) {
      throw new Error('Permissions must be an array');
    }
  }

  /**
   * Main command execution method
   * This is the entry point that handles all command logic
   * 
   * @param {Message} message - Discord message object
   * @param {Array} args - Command arguments
   * @returns {Promise<boolean>} Execution success status
   */
  async execute(message, args) {
    const startTime = Date.now();
    
    try {
      // Update usage statistics
      this._updateUsageStats();
      
      // Validate execution context
      if (!this._validateContext(message)) {
        return false;
      }
      
      // Parse and validate arguments
      const parsedArgs = this._parseArguments(args);
      if (!this._validateArguments(parsedArgs)) {
        await this._sendUsageMessage(message);
        return false;
      }
      
      // Execute the command
      const result = await this.run(message, parsedArgs);
      
      // Update performance statistics
      this._updatePerformanceStats(Date.now() - startTime);
      
      return result;
      
    } catch (error) {
      // Handle execution error
      this._handleError(error, message);
      return false;
    }
  }

  /**
   * Abstract method that must be implemented by subclasses
   * This is where the actual command logic goes
   * 
   * @param {Message} message - Discord message object
   * @param {Object} args - Parsed arguments
   * @returns {Promise<boolean>} Execution success status
   * @abstract
   */
  async run(message, args) {
    throw new Error(`Command ${this.name} must implement the run() method`);
  }

  /**
   * Validate execution context
   * 
   * @param {Message} message - Discord message object
   * @returns {boolean} Context validity
   * @private
   */
  _validateContext(message) {
    // Check if command is guild-only but executed in DM
    if (this.guildOnly && !message.guild) {
      logger.warn(`❌ Command ${this.name} is guild-only but executed in DM`);
      return false;
    }
    
    // Check if command is DM-only but executed in guild
    if (this.dmOnly && message.guild) {
      logger.warn(`❌ Command ${this.name} is DM-only but executed in guild`);
      return false;
    }
    
    return true;
  }

  /**
   * Parse command arguments
   * 
   * @param {Array} args - Raw arguments
   * @returns {Object} Parsed arguments
   * @private
   */
  _parseArguments(args) {
    const parsed = {};
    
    // Parse arguments based on defined schema
    for (const [key, definition] of Object.entries(this.args)) {
      const index = definition.index || 0;
      const value = args[index];
      
      if (value !== undefined) {
        // Apply type conversion
        parsed[key] = this._convertArgumentType(value, definition.type);
      } else if (definition.required) {
        // Required argument missing
        parsed[key] = null;
      } else {
        // Optional argument with default value
        parsed[key] = definition.default;
      }
    }
    
    return parsed;
  }

  /**
   * Convert argument to specified type
   * 
   * @param {string} value - Raw argument value
   * @param {string} type - Target type
   * @returns {any} Converted value
   * @private
   */
  _convertArgumentType(value, type) {
    switch (type) {
      case 'string':
        return String(value);
      case 'number':
        const num = Number(value);
        return isNaN(num) ? null : num;
      case 'integer':
        const int = parseInt(value);
        return isNaN(int) ? null : int;
      case 'boolean':
        return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
      case 'user':
        // Handle user mention or ID
        return value.replace(/[<@!>]/g, '');
      case 'channel':
        // Handle channel mention or ID
        return value.replace(/[<#>]/g, '');
      case 'role':
        // Handle role mention or ID
        return value.replace(/[<@&>]/g, '');
      default:
        return value;
    }
  }

  /**
   * Validate parsed arguments
   * 
   * @param {Object} args - Parsed arguments
   * @returns {boolean} Arguments validity
   * @private
   */
  _validateArguments(args) {
    for (const [key, definition] of Object.entries(this.args)) {
      const value = args[key];
      
      // Check required arguments
      if (definition.required && (value === null || value === undefined)) {
        logger.warn(`❌ Required argument missing: ${key}`);
        return false;
      }
      
      // Check type validation
      if (value !== null && value !== undefined && definition.validate) {
        if (!definition.validate(value)) {
          logger.warn(`❌ Invalid argument value: ${key} = ${value}`);
          return false;
        }
      }
      
      // Check range validation
      if (definition.min !== undefined && value < definition.min) {
        logger.warn(`❌ Argument too small: ${key} = ${value} (min: ${definition.min})`);
        return false;
      }
      
      if (definition.max !== undefined && value > definition.max) {
        logger.warn(`❌ Argument too large: ${key} = ${value} (max: ${definition.max})`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Send usage message to user
   * 
   * @param {Message} message - Discord message object
   * @private
   */
  async _sendUsageMessage(message) {
    try {
      const usageText = this._generateUsageText();
      await message.reply(`❌ Invalid usage.\n\n**Usage:** ${usageText}`);
    } catch (error) {
      logger.error('❌ Failed to send usage message:', error);
    }
  }

  /**
   * Generate usage text
   * 
   * @returns {string} Usage text
   * @private
   */
  _generateUsageText() {
    if (this.usage) {
      return this.usage;
    }
    
    const parts = [this.name];
    
    for (const [key, definition] of Object.entries(this.args)) {
      if (definition.required) {
        parts.push(`<${key}>`);
      } else {
        parts.push(`[${key}]`);
      }
    }
    
    return parts.join(' ');
  }

  /**
   * Handle execution error
   * 
   * @param {Error} error - Execution error
   * @param {Message} message - Discord message object
   * @private
   */
  _handleError(error, message) {
    this._errors++;
    
    logger.error(`❌ Error executing command ${this.name}:`, error);
    
    // Send error message to user
    this._sendErrorMessage(message, error);
  }

  /**
   * Send error message to user
   * 
   * @param {Message} message - Discord message object
   * @param {Error} error - Execution error
   * @private
   */
  async _sendErrorMessage(message, error) {
    try {
      let errorMessage = '❌ An error occurred while executing the command.';
      
      // Provide more specific error messages
      if (error.message.includes('permission')) {
        errorMessage = '🚫 You do not have permission to use this command.';
      } else if (error.message.includes('not found')) {
        errorMessage = '🔍 The requested resource was not found.';
      } else if (error.message.includes('invalid')) {
        errorMessage = '❌ Invalid arguments provided.';
      }
      
      await message.reply(errorMessage);
    } catch (replyError) {
      logger.error('❌ Failed to send error message:', replyError);
    }
  }

  /**
   * Update usage statistics
   * 
   * @private
   */
  _updateUsageStats() {
    this._usageCount++;
    this._lastUsed = new Date();
  }

  /**
   * Update performance statistics
   * 
   * @param {number} executionTime - Execution time in milliseconds
   * @private
   */
  _updatePerformanceStats(executionTime) {
    const totalExecutions = this._usageCount - this._errors;
    this._averageExecutionTime = 
      (this._averageExecutionTime * (totalExecutions - 1) + executionTime) / totalExecutions;
  }

  /**
   * Get command statistics
   * 
   * @returns {Object} Command statistics
   */
  getStats() {
    return {
      name: this.name,
      category: this.category,
      usageCount: this._usageCount,
      lastUsed: this._lastUsed,
      errors: this._errors,
      averageExecutionTime: this._averageExecutionTime,
      successRate: this._usageCount > 0 ? 
        ((this._usageCount - this._errors) / this._usageCount * 100).toFixed(2) : 0
    };
  }

  /**
   * Get help information
   * 
   * @returns {Object} Help information
   */
  getHelp() {
    return {
      name: this.name,
      description: this.description,
      category: this.category,
      usage: this._generateUsageText(),
      examples: this.examples,
      aliases: this.aliases,
      permissions: this.permissions,
      cooldown: this.cooldown,
      guildOnly: this.guildOnly,
      dmOnly: this.dmOnly
    };
  }

  /**
   * Check if user has permission to use this command
   * 
   * @param {GuildMember} member - Guild member
   * @returns {boolean} Permission status
   */
  hasPermission(member) {
    if (!member) return false;
    
    // Check if user has required permissions
    for (const permission of this.permissions) {
      if (!member.permissions.has(permission)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if bot has required permissions
   * 
   * @param {Guild} guild - Discord guild
   * @returns {boolean} Bot permission status
   */
  botHasPermissions(guild) {
    if (!guild) return false;
    
    const botMember = guild.members.me;
    if (!botMember) return false;
    
    // Check if bot has required permissions
    for (const permission of this.botPermissions) {
      if (!botMember.permissions.has(permission)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get command metadata for registration
   * 
   * @returns {Object} Command metadata
   */
  getMetadata() {
    return {
      name: this.name,
      description: this.description,
      category: this.category,
      permissions: this.permissions,
      cooldown: this.cooldown,
      aliases: this.aliases,
      usage: this.usage,
      examples: this.examples,
      args: this.args,
      guildOnly: this.guildOnly,
      dmOnly: this.dmOnly,
      botPermissions: this.botPermissions,
      execute: this.execute
    };
  }
}

module.exports = BaseCommand; 