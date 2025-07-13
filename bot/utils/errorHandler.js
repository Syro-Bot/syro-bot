/**
 * Error Handler Service
 * Centralized error handling with context and logging
 */

const LogManager = require('./logManager');

/**
 * Enhanced Error Handler with Context
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @param {Object} additionalData - Additional data for logging
 */
function handleError(error, context, additionalData = {}) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    ...additionalData
  };
  
  console.error(`❌ Error in ${context}:`, errorInfo);
  
  // Log to database if it's a critical error
  if (context.includes('lockdown') || context.includes('raid') || context.includes('spam')) {
    LogManager.logError(errorInfo).catch(err => {
      console.error('Failed to log error to database:', err);
    });
  }
}

/**
 * Safe async operation wrapper
 * @param {Function} operation - Async function to execute
 * @param {string} context - Context for error handling
 * @param {Function} fallback - Fallback function if operation fails
 */
async function safeAsyncOperation(operation, context, fallback = null) {
  try {
    return await operation();
  } catch (error) {
    handleError(error, context);
    if (fallback) {
      return fallback();
    }
    return null;
  }
}

/**
 * Validate input parameters
 * @param {Object} params - Parameters to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} - Validation result
 */
function validateInput(params, schema) {
  const errors = [];
  
  for (const [key, rules] of Object.entries(schema)) {
    const value = params[key];
    
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${key} is required`);
      continue;
    }
    
    if (value !== undefined && value !== null) {
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${key} must be of type ${rules.type}`);
      }
      
      if (rules.min && value < rules.min) {
        errors.push(`${key} must be at least ${rules.min}`);
      }
      
      if (rules.max && value > rules.max) {
        errors.push(`${key} must be at most ${rules.max}`);
      }
      
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${key} format is invalid`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  handleError,
  safeAsyncOperation,
  validateInput
}; 