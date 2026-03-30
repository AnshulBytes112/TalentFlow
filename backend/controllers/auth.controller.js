const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES, COOKIE_OPTIONS } = require('../utils/constants');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateRandomToken,
  hashToken,
  extractTokenFromHeader
} = require('../utils/jwtUtils');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

/**
 * Register new user
 */
const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, role = 'jobseeker' } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !password) {
    throw ApiError.badRequest('All fields are required');
  }

  // Validate password
  if (password.length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters long');
  }

  // Validate role - restrict to jobseeker/recruiter only (admin cannot be created via public register)
  if (!['jobseeker', 'recruiter'].includes(role)) {
    throw ApiError.badRequest('Invalid role selected');
  }

  // Check duplicate email
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.conflict('Email already exists');
  }

  // Generate email verification token
  const verificationToken = generateRandomToken();
  const hashedVerificationToken = hashToken(verificationToken);
  const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    role,
    emailVerificationToken: hashedVerificationToken,
    emailVerificationExpires: verificationTokenExpiry
  });

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  const hashedRefreshToken = hashToken(refreshToken);

  // Store refresh token
  user.refreshToken = hashedRefreshToken;
  await user.save();

  // Send verification email (async, don't block response)
  setImmediate(async () => {
    try {
      await sendVerificationEmail(user, verificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
    }
  });

  // Set refresh token cookie
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

  // Return user without sensitive fields
  const userResponse = {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt
  };

  res.status(201).json(
    ApiResponse.created({
      user: userResponse,
      accessToken
    }, 'Registration successful. Please check your email for verification.')
  );
});

/**
 * Login user
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw ApiError.badRequest('Email and password are required');
  }

  // Find user with password hash
  const user = await User.findOne({ email }).select('+passwordHash +refreshToken');
  
  // Check if account is active
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been suspended. Please contact support.');
  }

  // Compare password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  const hashedRefreshToken = hashToken(refreshToken);

  // Store refresh token
  user.refreshToken = hashedRefreshToken;
  await user.save();

  // Set refresh token cookie
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

  // Return user without sensitive fields
  const userResponse = {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt
  };

  res.json(
    ApiResponse.success({
      user: userResponse,
      accessToken
    }, 'Login successful')
  );
});

/**
 * Refresh access token
 */
const refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw ApiError.unauthorized('Refresh token is required');
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  // Find user
  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user) {
    throw ApiError.unauthorized('User not found');
  }

  // Check if refresh token matches stored hash
  const hashedRefreshToken = hashToken(refreshToken);
  if (user.refreshToken !== hashedRefreshToken) {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  // Generate new tokens
  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);
  const newHashedRefreshToken = hashToken(newRefreshToken);

  // Rotate refresh token
  user.refreshToken = newHashedRefreshToken;
  await user.save();

  // Set new refresh token cookie
  res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);

  res.json(
    ApiResponse.success({
      accessToken: newAccessToken
    }, 'Token refreshed successfully')
  );
});

/**
 * Logout user
 */
const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    // Find user and clear refresh token
    const hashedRefreshToken = hashToken(refreshToken);
    await User.findOneAndUpdate(
      { refreshToken: hashedRefreshToken },
      { refreshToken: undefined }
    );
  }

  // Clear both cookies
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0)
  });

  res.cookie('accessToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0)
  });

  res.json(
    ApiResponse.success(null, 'Logout successful')
  );
});

/**
 * Forgot password
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw ApiError.badRequest('Email is required');
  }

  // Find user (don't reveal if email exists)
  const user = await User.findOne({ email });
  
  // Always return same message for security
  const message = 'If an account with that email exists, a password reset link has been sent.';

  if (!user) {
    return res.json(
      ApiResponse.success(null, message)
    );
  }

  // Generate reset token
  const resetToken = generateRandomToken();
  const hashedResetToken = hashToken(resetToken);
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Save token to user
  user.passwordResetToken = hashedResetToken;
  user.passwordResetExpires = resetTokenExpiry;
  await user.save();

  // Send reset email (async, don't block response)
  setImmediate(async () => {
    try {
      await sendPasswordResetEmail(user, resetToken);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }
  });

  res.json(
    ApiResponse.success(null, message)
  );
});

/**
 * Reset password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    throw ApiError.badRequest('New password is required');
  }

  if (password.length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters long');
  }

  // Hash token and find user
  const hashedToken = hashToken(token);
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() }
  });

  if (!user) {
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  // Update password and clear reset fields
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshToken = undefined; // Invalidate all existing refresh tokens
  await user.save();

  res.json(
    ApiResponse.success(null, 'Password reset successful')
  );
});

/**
 * Get current user
 */
const getMe = asyncHandler(async (req, res) => {
  // User is already attached to req.user by verifyJWT middleware
  const user = await User.findById(req.user._id)
    .select('-passwordHash -refreshToken -passwordResetToken -passwordResetExpires -emailVerificationToken')
    .populate('profile');
  
  const userResponse = {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    profile: user.profile
  };

  res.json(
    ApiResponse.success(userResponse, 'User retrieved successfully')
  );
});

/**
 * Verify email
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    throw ApiError.badRequest('Verification token is required');
  }

  // Hash token and find user
  const hashedToken = hashToken(token);
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: new Date() }
  });

  if (!user) {
    throw ApiError.badRequest('Invalid or expired verification token');
  }

  // Verify email and clear verification fields
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json(
    ApiResponse.success(null, 'Email verified successfully')
  );
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  verifyEmail
};
