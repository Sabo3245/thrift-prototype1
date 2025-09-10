const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Optional auth middleware - doesn't require token but adds user if present
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
      const user = await User.findById(decoded.userId).select('-password');

      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // If token is invalid, continue without user
    next();
  }
};

// Check if user owns resource
const checkOwnership = (resourceField = 'sellerId') => {
  return (req, res, next) => {
    const resource = req.resource || req.item || req.transaction;

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const ownerId = resource[resourceField];

    if (!ownerId || !ownerId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied. You do not own this resource.' });
    }

    next();
  };
};

// Admin middleware
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Access denied. Please login.' });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }

  next();
};

// Rate limiting for sensitive operations
const sensitiveOperationLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + (req.user ? req.user._id : '');
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old attempts
    const userAttempts = attempts.get(key) || [];
    const validAttempts = userAttempts.filter(time => time > windowStart);

    if (validAttempts.length >= maxAttempts) {
      return res.status(429).json({ 
        message: `Too many attempts. Please try again in ${Math.ceil(windowMs / 60000)} minutes.` 
      });
    }

    validAttempts.push(now);
    attempts.set(key, validAttempts);

    next();
  };
};

module.exports = {
  auth,
  optionalAuth,
  checkOwnership,
  isAdmin,
  sensitiveOperationLimit
};
