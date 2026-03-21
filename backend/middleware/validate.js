const { validationResult } = require('express-validator');
const { ApiError } = require('../utils/ApiError');

/**
 * Check express-validator result, throw ApiError.badRequest() with all field errors if any
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const fieldErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg
    }));
    
    return next(ApiError.badRequest('Validation failed', fieldErrors));
  }
  
  next();
};

/**
 * Custom validation for file uploads
 */
const validateFileUpload = (allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file) {
      return next(ApiError.badRequest('File is required'));
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(req.file.mimetype)) {
      return next(ApiError.badRequest(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
    }

    // Check file size
    if (req.file.size > maxSize) {
      return next(ApiError.badRequest(`File size too large. Maximum size: ${maxSize / 1024 / 1024}MB`));
    }

    next();
  };
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder || 'desc';

  // Validate page
  if (page < 1) {
    return next(ApiError.badRequest('Page must be greater than 0'));
  }

  // Validate limit
  if (limit < 1 || limit > 100) {
    return next(ApiError.badRequest('Limit must be between 1 and 100'));
  }

  // Validate sort order
  if (!['asc', 'desc'].includes(sortOrder)) {
    return next(ApiError.badRequest('Sort order must be either asc or desc'));
  }

  req.pagination = {
    page,
    limit,
    skip: (page - 1) * limit,
    sortBy,
    sortOrder: sortOrder === 'desc' ? -1 : 1
  };

  next();
};

/**
 * Validate MongoDB ObjectId
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return next(ApiError.badRequest(`${paramName} is required`));
    }

    // Check if id is a valid MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(ApiError.badRequest(`Invalid ${paramName} format`));
    }

    next();
  };
};

/**
 * Validate email format
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return 'Password must be at least 8 characters long';
  }
  if (!hasUpperCase) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!hasLowerCase) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!hasNumbers) {
    return 'Password must contain at least one number';
  }
  if (!hasSpecialChar) {
    return 'Password must contain at least one special character';
  }

  return null; // Password is valid
};

/**
 * Sanitize input data
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  };

  const sanitizeObject = (obj) => {
    const sanitized = {};
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        sanitized[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitized[key] = sanitizeObject(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

module.exports = {
  validate,
  validateFileUpload,
  validatePagination,
  validateObjectId,
  validateEmail,
  validatePassword,
  sanitizeInput
};
