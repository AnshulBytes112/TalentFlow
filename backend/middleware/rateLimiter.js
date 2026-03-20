const rateLimit = require('express-rate-limit');
const { ApiError } = require('../utils/ApiError');

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.round(req.rateLimit.resetMs / 1000)
    });
  }
});

// Strict rate limiter for sensitive endpoints
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many attempts from this IP, please try again later.',
      retryAfter: Math.round(req.rateLimit.resetMs / 1000)
    });
  }
});

// Auth rate limiter (for login, register, etc.)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: 'Too many authentication attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts from this IP, please try again later.',
      retryAfter: Math.round(req.rateLimit.resetMs / 1000)
    });
  }
});

// Password reset rate limiter
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: 'Too many password reset attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many password reset attempts from this IP, please try again later.',
      retryAfter: Math.round(req.rateLimit.resetMs / 1000)
    });
  }
});

// Email verification rate limiter
const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 email verification requests per hour
  message: 'Too many email verification attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many email verification attempts from this IP, please try again later.',
      retryAfter: Math.round(req.rateLimit.resetMs / 1000)
    });
  }
});

// Job posting rate limiter (for recruiters)
const jobPostingLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10, // limit each user to 10 job posts per day
  keyGenerator: (req) => req.user?.id || req.ip,
  message: 'Too many job postings, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Daily job posting limit reached. Please try again tomorrow.',
      retryAfter: Math.round(req.rateLimit.resetMs / 1000)
    });
  }
});

// Application submission rate limiter (for job seekers)
const applicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each user to 20 applications per hour
  keyGenerator: (req) => req.user?.id || req.ip,
  message: 'Too many applications submitted, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Application limit reached. Please wait before submitting more applications.',
      retryAfter: Math.round(req.rateLimit.resetMs / 1000)
    });
  }
});

// File upload rate limiter
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 file uploads per hour
  message: 'Too many file uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many file uploads, please try again later.',
      retryAfter: Math.round(req.rateLimit.resetMs / 1000)
    });
  }
});

module.exports = {
  generalLimiter,
  strictLimiter,
  authLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  jobPostingLimiter,
  applicationLimiter,
  uploadLimiter,
};
