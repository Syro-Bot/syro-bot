const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h'; // 24 horas

/**
 * Generate JWT token for user
 * @param {Object} user - User object with id, username, etc.
 * @returns {string} JWT token
 */
function generateToken(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    avatar: user.avatar,
    discriminator: user.discriminator,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token payload or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.log('[JWT] Token verification failed:', error.message);
    return null;
  }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header (e.g., "Bearer <token>")
 * @returns {string|null} Token or null if not found
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove "Bearer " prefix
}

/**
 * Get user info from token
 * @param {string} token - JWT token
 * @returns {Object|null} User info or null if invalid
 */
function getUserFromToken(token) {
  const decoded = verifyToken(token);
  if (!decoded) return null;
  
  return {
    id: decoded.userId,
    username: decoded.username,
    avatar: decoded.avatar,
    discriminator: decoded.discriminator
  };
}

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  getUserFromToken,
  JWT_SECRET
}; 