const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');

const signToken = promisify(jwt.sign);
const verifyToken = promisify(jwt.verify);

class TokenUtils {
  /**
   * Generate access token
   * @param {string} userId - User ID
   * @returns {Promise<string>} Access token
   */
  static async generateAccessToken(userId) {
    return await signToken(
      { 
        id: userId,
        type: 'access'
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
    );
  }

  /**
   * Generate refresh token
   * @param {string} userId - User ID
   * @returns {Promise<string>} Refresh token
   */
  static async generateRefreshToken(userId) {
    return await signToken(
      { 
        id: userId,
        type: 'refresh'
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );
  }

  /**
   * Verify access token
   * @param {string} token - Access token
   * @returns {Promise<object>} Decoded token payload
   */
  static async verifyAccessToken(token) {
    return await verifyToken(token, process.env.JWT_ACCESS_SECRET);
  }

  /**
   * Verify refresh token
   * @param {string} token - Refresh token
   * @returns {Promise<object>} Decoded token payload
   */
  static async verifyRefreshToken(token) {
    return await verifyToken(token, process.env.JWT_REFRESH_SECRET);
  }

  /**
   * Generate email verification token
   * @returns {object} Token and hashed token
   */
  static generateEmailVerificationToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    return {
      token,
      hashedToken,
      expiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  /**
   * Generate password reset token
   * @returns {object} Token and hashed token
   */
  static generatePasswordResetToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    return {
      token,
      hashedToken,
      expiry: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    };
  }

  /**
   * Hash a token for storage
   * @param {string} token - Raw token
   * @returns {string} Hashed token
   */
  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} Token or null
   */
  static extractTokenFromHeader(authHeader) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  /**
   * Generate random token
   * @param {number} length - Token length in bytes
   * @returns {string} Random hex token
   */
  static generateRandomToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}

module.exports = TokenUtils;
