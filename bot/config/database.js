/**
 * Database Configuration Module
 * 
 * Handles MongoDB connection with enhanced security, connection pooling,
 * and proper error handling for the Syro Discord bot.
 * 
 * @author Syro Development Team
 * @version 2.0.0
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * MongoDB Connection Options
 * Enhanced security and performance settings
 */
const MONGODB_OPTIONS = {
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2,  // Minimum number of connections in the pool
  serverSelectionTimeoutMS: 5000, // Timeout for server selection
  socketTimeoutMS: 45000, // Socket timeout
  autoIndex: false, // Disable automatic index creation in production
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  family: 4, // Force IPv4
  retryWrites: true,
  w: 'majority', // Write concern
  readPreference: 'primaryPreferred'
};

/**
 * Validate MongoDB URI format and security
 * @param {string} uri - MongoDB connection URI
 * @returns {boolean} - True if URI is valid and secure
 */
function validateMongoUri(uri) {
  if (!uri || typeof uri !== 'string') {
    logger.error('MongoDB URI is missing or invalid');
    return false;
  }

  // Check for required components
  if (!uri.includes('mongodb://') && !uri.includes('mongodb+srv://')) {
    logger.error('Invalid MongoDB URI format');
    return false;
  }

  // Check for authentication
  if (!uri.includes('@') && !uri.includes('localhost')) {
    logger.warn('MongoDB URI does not include authentication');
  }

  // Check for SSL/TLS in production
  if (process.env.NODE_ENV === 'production' && !uri.includes('ssl=true')) {
    logger.warn('MongoDB URI does not include SSL/TLS in production');
  }

  return true;
}

/**
 * Initialize database connection with enhanced security
 * @returns {Promise<mongoose.Connection>} - Database connection
 */
async function initializeDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!validateMongoUri(mongoUri)) {
      throw new Error('Invalid MongoDB configuration');
    }

    // Set mongoose options
    mongoose.set('strictQuery', false);
    
    // Connect to MongoDB
    const connection = await mongoose.connect(mongoUri, MONGODB_OPTIONS);
    
    logger.database('Connected to MongoDB Atlas successfully', {
      host: connection.connection.host,
      port: connection.connection.port,
      database: connection.connection.name
    });

    // Handle connection events
    connection.connection.on('error', (error) => {
      logger.errorWithContext(error, { context: 'MongoDB connection error' });
    });

    connection.connection.on('disconnected', () => {
      logger.warn('MongoDB connection disconnected');
    });

    connection.connection.on('reconnected', () => {
      logger.database('MongoDB connection reestablished');
    });

    return connection;
  } catch (error) {
    logger.errorWithContext(error, { context: 'Database initialization' });
    throw error;
  }
}

/**
 * Gracefully close database connection
 * @returns {Promise<void>}
 */
async function closeDatabase() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.database('Database connection closed gracefully');
    }
  } catch (error) {
    logger.errorWithContext(error, { context: 'Database closure' });
  }
}

/**
 * Get database health status
 * @returns {Object} - Database health information
 */
function getDatabaseHealth() {
  const connection = mongoose.connection;
  
  return {
    status: connection.readyState === 1 ? 'connected' : 'disconnected',
    readyState: connection.readyState,
    host: connection.host,
    port: connection.port,
    database: connection.name,
    uptime: connection.readyState === 1 ? Date.now() - (connection.startTime || Date.now()) : 0
  };
}

module.exports = {
  initializeDatabase,
  closeDatabase,
  getDatabaseHealth,
  validateMongoUri
}; 