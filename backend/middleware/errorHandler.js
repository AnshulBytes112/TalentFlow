const { ApiError } = require('../utils/ApiError');

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ApiError(400, message);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    error = new ApiError(400, `Duplicate field value: ${field} with value: ${value}. Please use another value.`);
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    error = new ApiError(400, 'Resource not found');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new ApiError(401, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new ApiError(401, 'Token expired');
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new ApiError(400, 'File size too large');
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = new ApiError(400, 'Too many files');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new ApiError(400, 'Unexpected file field');
  }

  // Cloudinary errors
  if (err.message && err.message.includes('Cloudinary')) {
    error = new ApiError(500, 'File upload failed');
  }

  // Email errors
  if (err.message && err.message.includes('Email')) {
    error = new ApiError(500, 'Email sending failed');
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Don't expose stack trace in production
  const response = {
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  // Add validation errors if they exist
  if (err.errors) {
    response.errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message
    }));
  }

  res.status(statusCode).json(response);
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`);
  next(error);
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFound,
};
