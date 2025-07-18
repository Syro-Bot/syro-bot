const { extractTokenFromHeader, getUserFromToken } = require('../utils/jwtUtils');

/**
 * JWT Authentication Middleware
 * Validates JWT token from Authorization header or HttpOnly cookie and adds user info to request object
 */
function jwtAuthMiddleware(req, res, next) {
  try {
    // Try to get token from cookie first, then from Authorization header
    let token = req.cookies && req.cookies['syro-jwt-token'];
    
    if (!token) {
      // Try Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      console.log('[JWT] No token provided');
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }

    // Verify token and get user info
    const user = getUserFromToken(token);
    if (!user) {
      console.log('[JWT] Invalid token');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }

    // Add user info to request object 
    req.user = user;
    req.token = token;

    console.log('[JWT] Authenticated user:', user.username);
    next();

  } catch (error) {
    console.error('[JWT] Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication error' 
    });
  }
}

/**
 * Optional JWT Authentication Middleware
 * Similar to jwtAuthMiddleware but doesn't return 401 if no token
 * Useful for endpoints that work with or without authentication
 */
function optionalJwtAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (token) {
      const user = getUserFromToken(token);
      if (user) {
        req.user = user;
        req.token = token;
        console.log('[JWT] Optional auth - user found:', user.username);
      }
    }
    
    next();
    
  } catch (error) {
    console.error('[JWT] Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
}

module.exports = {
  jwtAuthMiddleware,
  optionalJwtAuthMiddleware
}; 