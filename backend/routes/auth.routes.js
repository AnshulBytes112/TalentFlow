const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { verifyJWT } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter, apiLimiter } = require('../middleware/rateLimiter');
const { ROLES } = require('../utils/constants');

// Validation rules
const registerValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role')
    .optional()
    .isIn(Object.values(ROLES))
    .withMessage('Invalid role'),
  body('otp')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('OTP must be a 6-digit code')
];

const sendRegistrationOtpValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

const resetPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('otp')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('OTP must be a 6-digit code'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Routes
router.post(
  '/send-registration-otp',
  authLimiter,
  sendRegistrationOtpValidation,
  validate,
  authController.sendRegistrationOtp
);

router.post(
  '/register',
  authLimiter,
  registerValidation,
  validate,
  authController.register
);

router.post(
  '/login',
  authLimiter,
  loginValidation,
  validate,
  authController.login
);

router.post(
  '/refresh-token',
  apiLimiter,
  authController.refreshToken
);

router.post(
  '/logout',
  verifyJWT,
  authController.logout
);

router.post(
  '/forgot-password',
  authLimiter,
  forgotPasswordValidation,
  validate,
  authController.forgotPassword
);

router.post(
  '/reset-password-with-otp',
  apiLimiter,
  resetPasswordValidation,
  validate,
  authController.resetPasswordWithOtp
);

router.get(
  '/me',
  verifyJWT,
  authController.getMe
);

router.get(
  '/verify-email/:token',
  apiLimiter,
  authController.verifyEmail
);

module.exports = router;
