const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate JWT access token
 */
const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

/**
 * Generate JWT refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

/**
 * Generate random token for email verification/password reset
 */
const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash token for database storage
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Extract token from Authorization header
 */
const extractTokenFromHeader = (authHeader) => {
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateRandomToken,
  hashToken,
  extractTokenFromHeader
};
