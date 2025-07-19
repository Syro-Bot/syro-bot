/**
 * @fileoverview Command Executor - Command Execution and Error Handling System
 * 
 * Advanced command execution system for Discord bot commands.
 * Provides safe command execution, comprehensive error handling,
 * performance monitoring, and execution analytics.
 * 
 * Features:
 * - Safe command execution with error boundaries
 * - Comprehensive error handling and logging
 * - Performance monitoring and execution time tracking
 * - Command result validation and sanitization
 * - Execution analytics and statistics
 * - Timeout protection and resource management
 * 
 * @author Syro Backend Team
 * @version 1.0.0
 * @since 2024
 * @license MIT
 */

const logger = require('../../utils/logger');

/**
 * Command Executor Class
 * 
 * Manages command execution, error handling, and performance monitoring.
 * Provides safe and efficient command execution with comprehensive logging.
 * 
 * @class CommandExecutor
 */
class CommandExecutor {
  /**
   * Initialize the Command Executor
   * 
   * @param {Object} options - Configuration options
   * @param {number} options.timeout - Command execution timeout in milliseconds
   * @param {boolean} options.enableAnalytics - Enable execution analytics
   * @param {boolean} options.enableValidation - Enable result validation
   * @param {number} options.maxRetries - Maximum retry attempts for failed commands
   */
  constructor(options = {}) {
    this.timeout = options.timeout || 30000; // 30 seconds
    this.enableAnalytics = options.enableAnalytics !== false;
    this.enableValidation = options.enableValidation !== false;
    this.maxRetries = options.maxRetries || 1;
    
    // Execution tracking
    this.executionHistory = [];
    this.activeExecutions = new Map();
    
    // Statistics
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      timeoutExecutions: 0,
      retryExecutions: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0
    };
    
    // Performance tracking
    this.performance = {
      fastestExecution: Infinity,
      slowestExecution: 0,
      executionTimes: []
    };
    
    // Error tracking
    this.errors = {
      totalErrors: 0,
      errorTypes: new Map(),
      recentErrors: []
    };
    
    // Initialize the system
    this._initialize();
  }

  /**
   * Initialize the command executor
   * 
   * @private
   */
  _initialize() {
    try {
      logger.info('⚡ Initializing Command Executor...');
      
      // Setup cleanup tasks
      this._setupCleanup();
      
      // Setup analytics
      if (this.enableAnalytics) {
        this._setupAnalytics();
      }
      
      logger.info('✅ Command Executor initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Command Executor:', error);
      throw error;
    }
  }

  /**
   * Setup cleanup tasks
   * 
   * @private
   */
  _setupCleanup() {
    // Clean up execution history every hour
    setInterval(() => {
      this._cleanupExecutionHistory();
    }, 3600000); // 1 hour
    
    // Clean up active executions every 5 minutes
    setInterval(() => {
      this._cleanupActiveExecutions();
    }, 300000); // 5 minutes
  }

  /**
   * Setup analytics
   * 
   * @private
   */
  _setupAnalytics() {
    // Reset performance stats every day
    setInterval(() => {
      this._resetPerformanceStats();
    }, 86400000); // 24 hours
  }

  /**
   * Execute a command with comprehensive error handling
   * 
   * @param {Message} message - Discord message object
   * @param {Object} command - Command object
   * @param {Array} args - Command arguments
   * @returns {Promise<boolean>} Execution success status
   */
  async execute(message, command, args) {
    const executionId = this._generateExecutionId();
    const startTime = Date.now();
    
    try {
      // Track active execution
      this.activeExecutions.set(executionId, {
        messageId: message.id,
        commandName: command.name,
        userId: message.author.id,
        guildId: message.guild?.id,
        startTime,
        status: 'running'
      });
      
      this.stats.totalExecutions++;
      
      // Validate command and arguments
      if (!this._validateExecution(message, command, args)) {
        throw new Error('Invalid command execution parameters');
      }
      
      // Execute command with timeout protection
      const result = await this._executeWithTimeout(
        command.execute(message, args),
        this.timeout,
        executionId
      );
      
      // Validate result if enabled
      if (this.enableValidation && !this._validateResult(result)) {
        throw new Error('Command returned invalid result');
      }
      
      // Update statistics for successful execution
      const executionTime = Date.now() - startTime;
      this._updateSuccessStats(executionTime);
      
      // Log successful execution
      this._logExecution(executionId, command.name, message, executionTime, true);
      
      // Update active execution status
      this.activeExecutions.set(executionId, {
        ...this.activeExecutions.get(executionId),
        status: 'completed',
        executionTime,
        success: true
      });
      
      return true;
      
    } catch (error) {
      // Handle execution error
      const executionTime = Date.now() - startTime;
      const retryResult = await this._handleExecutionError(
        error, 
        executionId, 
        command, 
        message, 
        args, 
        executionTime
      );
      
      // Update active execution status
      this.activeExecutions.set(executionId, {
        ...this.activeExecutions.get(executionId),
        status: 'failed',
        executionTime,
        success: false,
        error: error.message
      });
      
      return retryResult;
      
    } finally {
      // Clean up active execution after a delay
      setTimeout(() => {
        this.activeExecutions.delete(executionId);
      }, 60000); // 1 minute
    }
  }

  /**
   * Execute command with timeout protection
   * 
   * @param {Promise} commandPromise - Command execution promise
   * @param {number} timeout - Timeout in milliseconds
   * @param {string} executionId - Execution ID
   * @returns {Promise<any>} Command result
   * @private
   */
  async _executeWithTimeout(commandPromise, timeout, executionId) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.stats.timeoutExecutions++;
        reject(new Error(`Command execution timed out after ${timeout}ms`));
      }, timeout);
      
      commandPromise
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Handle execution error with retry logic
   * 
   * @param {Error} error - Execution error
   * @param {string} executionId - Execution ID
   * @param {Object} command - Command object
   * @param {Message} message - Discord message object
   * @param {Array} args - Command arguments
   * @param {number} executionTime - Execution time
   * @returns {Promise<boolean>} Retry result
   * @private
   */
  async _handleExecutionError(error, executionId, command, message, args, executionTime) {
    // Update error statistics
    this._updateErrorStats(error);
    
    // Log execution error
    this._logExecution(executionId, command.name, message, executionTime, false, error);
    
    // Check if retry is possible
    if (this.maxRetries > 0 && this._shouldRetry(error)) {
      return await this._retryExecution(command, message, args, executionId);
    }
    
    // Update failure statistics
    this._updateFailureStats(executionTime);
    
    // Send error message to user
    await this._sendErrorMessage(message, error, command);
    
    return false;
  }

  /**
   * Retry command execution
   * 
   * @param {Object} command - Command object
   * @param {Message} message - Discord message object
   * @param {Array} args - Command arguments
   * @param {string} executionId - Execution ID
   * @returns {Promise<boolean>} Retry result
   * @private
   */
  async _retryExecution(command, message, args, executionId) {
    this.stats.retryExecutions++;
    
    try {
      logger.info(`🔄 Retrying command execution: ${command.name} (${executionId})`);
      
      const retryResult = await this._executeWithTimeout(
        command.execute(message, args),
        this.timeout,
        executionId
      );
      
      logger.info(`✅ Command retry successful: ${command.name} (${executionId})`);
      return true;
      
    } catch (retryError) {
      logger.error(`❌ Command retry failed: ${command.name} (${executionId})`, retryError);
      
      // Update failure statistics
      this._updateFailureStats(0);
      
      // Send error message to user
      await this._sendErrorMessage(message, retryError, command);
      
      return false;
    }
  }

  /**
   * Determine if command should be retried
   * 
   * @param {Error} error - Execution error
   * @returns {boolean} Should retry
   * @private
   */
  _shouldRetry(error) {
    // Don't retry on certain error types
    const nonRetryableErrors = [
      'Invalid command execution parameters',
      'Command returned invalid result',
      'Permission denied',
      'User not found',
      'Channel not found'
    ];
    
    return !nonRetryableErrors.some(errorType => 
      error.message.includes(errorType)
    );
  }

  /**
   * Send error message to user
   * 
   * @param {Message} message - Discord message object
   * @param {Error} error - Execution error
   * @param {Object} command - Command object
   * @private
   */
  async _sendErrorMessage(message, error, command) {
    try {
      let errorMessage = '❌ An error occurred while executing the command.';
      
      // Provide more specific error messages for common errors
      if (error.message.includes('timeout')) {
        errorMessage = '⏰ Command execution timed out. Please try again.';
      } else if (error.message.includes('permission')) {
        errorMessage = '🚫 You do not have permission to use this command.';
      } else if (error.message.includes('not found')) {
        errorMessage = '🔍 The requested resource was not found.';
      }
      
      await message.reply(errorMessage);
      
    } catch (replyError) {
      logger.error('❌ Failed to send error message to user:', replyError);
    }
  }

  /**
   * Validate execution parameters
   * 
   * @param {Message} message - Discord message object
   * @param {Object} command - Command object
   * @param {Array} args - Command arguments
   * @returns {boolean} Validation result
   * @private
   */
  _validateExecution(message, command, args) {
    if (!message || !command || !command.execute) {
      logger.error('❌ Invalid execution parameters');
      return false;
    }
    
    if (typeof command.execute !== 'function') {
      logger.error('❌ Command execute is not a function');
      return false;
    }
    
    if (!Array.isArray(args)) {
      logger.error('❌ Command arguments must be an array');
      return false;
    }
    
    return true;
  }

  /**
   * Validate command result
   * 
   * @param {any} result - Command result
   * @returns {boolean} Validation result
   * @private
   */
  _validateResult(result) {
    // Basic validation - can be extended based on requirements
    if (result === undefined || result === null) {
      return true; // Allow undefined/null results
    }
    
    // Check for common invalid result types
    if (typeof result === 'function') {
      logger.warn('⚠️ Command returned function instead of result');
      return false;
    }
    
    return true;
  }

  /**
   * Update success statistics
   * 
   * @param {number} executionTime - Execution time in milliseconds
   * @private
   */
  _updateSuccessStats(executionTime) {
    this.stats.successfulExecutions++;
    this.stats.totalExecutionTime += executionTime;
    this.stats.averageExecutionTime = 
      this.stats.totalExecutionTime / this.stats.totalExecutions;
    
    // Update performance tracking
    this.performance.fastestExecution = Math.min(this.performance.fastestExecution, executionTime);
    this.performance.slowestExecution = Math.max(this.performance.slowestExecution, executionTime);
    this.performance.executionTimes.push(executionTime);
    
    // Keep only last 1000 execution times
    if (this.performance.executionTimes.length > 1000) {
      this.performance.executionTimes.shift();
    }
  }

  /**
   * Update failure statistics
   * 
   * @param {number} executionTime - Execution time in milliseconds
   * @private
   */
  _updateFailureStats(executionTime) {
    this.stats.failedExecutions++;
    this.stats.totalExecutionTime += executionTime;
    this.stats.averageExecutionTime = 
      this.stats.totalExecutionTime / this.stats.totalExecutions;
  }

  /**
   * Update error statistics
   * 
   * @param {Error} error - Execution error
   * @private
   */
  _updateErrorStats(error) {
    this.errors.totalErrors++;
    
    // Track error types
    const errorType = error.constructor.name;
    this.errors.errorTypes.set(errorType, (this.errors.errorTypes.get(errorType) || 0) + 1);
    
    // Track recent errors
    this.errors.recentErrors.push({
      type: errorType,
      message: error.message,
      timestamp: new Date(),
      stack: error.stack
    });
    
    // Keep only last 100 errors
    if (this.errors.recentErrors.length > 100) {
      this.errors.recentErrors.shift();
    }
  }

  /**
   * Log execution details
   * 
   * @param {string} executionId - Execution ID
   * @param {string} commandName - Command name
   * @param {Message} message - Discord message object
   * @param {number} executionTime - Execution time
   * @param {boolean} success - Execution success
   * @param {Error} error - Execution error (optional)
   * @private
   */
  _logExecution(executionId, commandName, message, executionTime, success, error = null) {
    const logEntry = {
      executionId,
      commandName,
      userId: message.author.id,
      username: message.author.tag,
      guildId: message.guild?.id,
      guildName: message.guild?.name,
      channelId: message.channel.id,
      channelName: message.channel.name,
      executionTime,
      success,
      timestamp: new Date(),
      error: error ? {
        type: error.constructor.name,
        message: error.message
      } : null
    };
    
    this.executionHistory.push(logEntry);
    
    // Keep only last 1000 entries
    if (this.executionHistory.length > 1000) {
      this.executionHistory.shift();
    }
    
    // Log to console
    if (success) {
      logger.info(`✅ Command executed: ${commandName} (${executionTime}ms) - ${executionId}`);
    } else {
      logger.error(`❌ Command failed: ${commandName} (${executionTime}ms) - ${executionId}`, error);
    }
  }

  /**
   * Generate unique execution ID
   * 
   * @returns {string} Execution ID
   * @private
   */
  _generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get execution statistics
   * 
   * @returns {Object} Execution statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalExecutions > 0 ? 
        (this.stats.successfulExecutions / this.stats.totalExecutions * 100).toFixed(2) : 0,
      retryRate: this.stats.totalExecutions > 0 ? 
        (this.stats.retryExecutions / this.stats.totalExecutions * 100).toFixed(2) : 0,
      performance: {
        ...this.performance,
        fastestExecution: this.performance.fastestExecution === Infinity ? 0 : this.performance.fastestExecution,
        averageExecutionTime: this.stats.averageExecutionTime.toFixed(2)
      },
      errors: {
        ...this.errors,
        errorTypes: Object.fromEntries(this.errors.errorTypes)
      },
      activeExecutions: this.activeExecutions.size
    };
  }

  /**
   * Get execution history
   * 
   * @param {Object} filters - Filter options
   * @param {string} filters.commandName - Filter by command name
   * @param {string} filters.userId - Filter by user ID
   * @param {string} filters.guildId - Filter by guild ID
   * @param {boolean} filters.success - Filter by success status
   * @param {number} filters.limit - Maximum number of entries
   * @returns {Array} Filtered execution history
   */
  getExecutionHistory(filters = {}) {
    let entries = [...this.executionHistory];
    
    if (filters.commandName) {
      entries = entries.filter(entry => entry.commandName === filters.commandName);
    }
    
    if (filters.userId) {
      entries = entries.filter(entry => entry.userId === filters.userId);
    }
    
    if (filters.guildId) {
      entries = entries.filter(entry => entry.guildId === filters.guildId);
    }
    
    if (filters.success !== undefined) {
      entries = entries.filter(entry => entry.success === filters.success);
    }
    
    if (filters.limit) {
      entries = entries.slice(-filters.limit);
    }
    
    return entries;
  }

  /**
   * Get active executions
   * 
   * @returns {Array} Active executions
   */
  getActiveExecutions() {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Clean up execution history
   * 
   * @private
   */
  _cleanupExecutionHistory() {
    const oneDayAgo = new Date(Date.now() - 86400000); // 24 hours ago
    
    this.executionHistory = this.executionHistory.filter(entry => 
      entry.timestamp > oneDayAgo
    );
    
    logger.debug(`🧹 Cleaned up execution history, ${this.executionHistory.length} entries remaining`);
  }

  /**
   * Clean up active executions
   * 
   * @private
   */
  _cleanupActiveExecutions() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [executionId, execution] of this.activeExecutions) {
      // Remove executions older than 1 hour
      if (now - execution.startTime > 3600000) {
        this.activeExecutions.delete(executionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.debug(`🧹 Cleaned up ${cleanedCount} stale active executions`);
    }
  }

  /**
   * Reset performance statistics
   * 
   * @private
   */
  _resetPerformanceStats() {
    this.performance.fastestExecution = Infinity;
    this.performance.slowestExecution = 0;
    this.performance.executionTimes = [];
    
    logger.info('🔄 Performance statistics reset');
  }

  /**
   * Clear all execution data
   * 
   * @returns {boolean} Success status
   */
  clearAllData() {
    try {
      this.executionHistory = [];
      this.activeExecutions.clear();
      this.errors.recentErrors = [];
      this.errors.errorTypes.clear();
      
      logger.info('🗑️ All execution data cleared');
      return true;
      
    } catch (error) {
      logger.error('❌ Failed to clear execution data:', error);
      return false;
    }
  }
}

module.exports = CommandExecutor; 