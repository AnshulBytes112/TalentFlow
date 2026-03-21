const { ApiError } = require('../utils/ApiError');
const { ROLES } = require('../utils/constants');

/**
 * Role guard middleware factory function
 * @param {...string} roles - Allowed role strings
 * @returns {Function} Express middleware function
 */
const roleGuard = (...roles) => {
  return (req, res, next) => {
    // Assumes verifyJWT has already run and req.user is set
    
    // If req.user is missing: throw ApiError.unauthorized('Authentication required')
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    // Check if req.user.role is included in the roles array using plain string comparison
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(`Access denied. Required role: ${roles.join(' or ')}`);
    }

    // If role is allowed: call next()
    next();
  };
};

module.exports = roleGuard;
