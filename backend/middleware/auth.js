const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ApiError } = require('../utils/ApiError');
const { COOKIE_OPTIONS } = require('../utils/constants');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verify JWT token and attach user to request
 */
const verifyJWT = asyncHandler(async (req, res, next) => {
  let token;

  // Extract token from Authorization header (Bearer token) OR from httpOnly cookie named 'accessToken'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  // If no token found: throw ApiError.unauthorized('Access token is required')
  if (!token) {
    throw ApiError.unauthorized('Access token is required');
  }

  // Verify token using jwt.verify(token, process.env.JWT_ACCESS_SECRET)
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    // If verification fails (JsonWebTokenError): throw ApiError.unauthorized('Invalid token')
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid token');
    }
    // If token expired (TokenExpiredError): throw ApiError.unauthorized('Token has expired')
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token has expired');
    }
    throw error;
  }

  // Fetch user from MongoDB using Mongoose
  const user = await User.findById(decoded.id).select('-passwordHash -refreshToken -passwordResetToken');

  // If user not found: throw ApiError.unauthorized('User no longer exists')
  if (!user) {
    throw ApiError.unauthorized('User no longer exists');
  }

  // If user.isActive === false: throw ApiError.forbidden('Your account has been suspended')
  if (user.isActive === false) {
    throw ApiError.forbidden('Your account has been suspended');
  }

  // Attach full user document to req.user
  req.user = user;

  next();
});

/**
 * Optional authentication - doesn't throw if no token present
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  // Extract token from Authorization header (Bearer token) OR from httpOnly cookie named 'accessToken'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  // BUT if no token is present, just call next() without throwing
  if (!token) {
    return next();
  }

  // If token exists but is invalid/expired, still call next() without throwing (don't block the request)
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    // Silently continue for optional auth
    return next();
  }

  // Only attach req.user if token is valid and user is found and isActive
  try {
    const user = await User.findById(decoded.id).select('-passwordHash -refreshToken -passwordResetToken');
    
    if (user && user.isActive === true) {
      req.user = user;
    }
  } catch (error) {
    // Silently continue for optional auth
  }

  next();
});

/**
 * Set access token cookie
 */
const setAccessTokenCookie = (res, token) => {
  res.cookie('accessToken', token, COOKIE_OPTIONS);
};

/**
 * Clear access token cookie
 */
const clearAccessTokenCookie = (res) => {
  res.cookie('accessToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
  });
};

module.exports = {
  verifyJWT,
  optionalAuth,
  setAccessTokenCookie,
  clearAccessTokenCookie
};
