const rateLimit = require('express-rate-limit');
const { ApiError } = require('../utils/ApiError');

/**
 * Auth limiter: 10 req / 15 min per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: Math.round(req.rateLimit.resetMs / 1000)
    });
  }
});

/**
 * API limiter: 100 req / 15 min per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.',
      retryAfter: Math.round(req.rateLimit.resetMs / 1000)
    });
  }
});

/**
 * Upload limiter: 5 req / hour per userId (use req.user.id as key)
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    success: false,
    message: 'Too many upload attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many upload attempts, please try again later.',
      retryAfter: Math.round(req.rateLimit.resetMs / 1000)
    });
  }
});

/**
 * Password reset limiter: 3 req / hour per IP
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts, please try again later.',
      retryAfter: Math.round(req.rateLimit.resetMs / 1000)
    });
  }
});

/**
 * Email verification limiter: 5 req / hour per IP
 */
const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    message: 'Too many email verification attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many email verification attempts, please try again later.',
      retryAfter: Math.round(req.rateLimit.resetMs / 1000)
    });
  }
});

/**
 * Job posting limiter for recruiters: 10 req / day per user
 */
const jobPostingLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    success: false,
    message: 'Daily job posting limit reached, please try again tomorrow.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Daily job posting limit reached, please try again tomorrow.',
      retryAfter: Math.round(req.rateLimit.resetMs / 1000)
    });
  }
});

/**
 * Application submission limiter: 20 req / hour per user
 */
const applicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    success: false,
    message: 'Too many applications submitted, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many applications submitted, please try again later.',
      retryAfter: Math.round(req.rateLimit.resetMs / 1000)
    });
  }
});

module.exports = {
  authLimiter,
  apiLimiter,
  uploadLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  jobPostingLimiter,
  applicationLimiter
};
