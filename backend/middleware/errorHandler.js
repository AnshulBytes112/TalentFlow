const { ApiError } = require('../utils/ApiError');

/**
 * Global Express error handler for MongoDB + Mongoose stack
 */
const errorHandler = (err, req, res, next) => {
  // 1. ApiError instances (err instanceof ApiError)
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors
    });
  }

  // 2. Mongoose Duplicate Key (err.code === 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // 3. Mongoose CastError (err.name === 'CastError')
  if (err.name === 'CastError') {
    return res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  }

  // 4. Mongoose ValidationError (err.name === 'ValidationError')
  if (err.name === 'ValidationError') {
    const fieldErrors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: fieldErrors
    });
  }

  // 5. JWT JsonWebTokenError (err.name === 'JsonWebTokenError')
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  // 6. JWT TokenExpiredError (err.name === 'TokenExpiredError')
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token has expired. Please login again'
    });
  }

  // 7. Multer file size error (err.code === 'LIMIT_FILE_SIZE')
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5MB'
    });
  }

  // 8. Multer unexpected field (err.code === 'LIMIT_UNEXPECTED_FILE')
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field'
    });
  }

  // 9. express-validator errors (err.type === 'validation')
  if (err.type === 'validation') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors
    });
  }

  // 10. All other errors (fallback)
  console.error('Unhandled error:', err);

  if (process.env.NODE_ENV === 'production') {
    // In production: return 500 with generic message, never leak stack
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } else {
    // In development: return 500 with err.message + err.stack for debugging
    return res.status(500).json({
      success: false,
      message: err.message,
      stack: err.stack
    });
  }
};

/**
 * 404 handler for undefined routes
 */
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`);
  next(error);
};

module.exports = errorHandler;
