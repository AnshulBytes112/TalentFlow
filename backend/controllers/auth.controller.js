const User = require('../models/User');
const RegistrationOtp = require('../models/RegistrationOtp');
const PasswordResetOtp = require('../models/PasswordResetOtp');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES, COOKIE_OPTIONS } = require('../utils/constants');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  extractTokenFromHeader
} = require('../utils/jwtUtils');
const { sendVerificationEmail, sendPasswordResetEmail, sendRegistrationOtpEmail, sendPasswordResetOtpEmail } = require('../services/emailService');

const REGISTRATION_OTP_TTL_MS = 10 * 60 * 1000;
const MAX_REGISTRATION_OTP_ATTEMPTS = 5;
const PASSWORD_RESET_OTP_TTL_MS = 10 * 60 * 1000;
const MAX_PASSWORD_RESET_OTP_ATTEMPTS = 5;

const generateSixDigitOtp = () => String(Math.floor(100000 + Math.random() * 900000));

/**
 * Send OTP for registration email verification
 */
const sendRegistrationOtp = asyncHandler(async (req, res) => {
  const { email, firstName } = req.body;

  if (!email) {
    throw ApiError.badRequest('Email is required');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw ApiError.conflict('Email already exists');
  }

  const otp = generateSixDigitOtp();
  const otpHash = hashToken(otp);
  const expiresAt = new Date(Date.now() + REGISTRATION_OTP_TTL_MS);

  await RegistrationOtp.findOneAndUpdate(
    { email: normalizedEmail },
    {
      email: normalizedEmail,
      otpHash,
      expiresAt,
      attempts: 0,
      lastSentAt: new Date()
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  await sendRegistrationOtpEmail(normalizedEmail, otp, firstName);

  res.json(
    ApiResponse.success(null, 'OTP sent successfully to your email')
  );
});

/**
 * Register new user
 */
const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, role = 'jobseeker', otp } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !password || !otp) {
    throw ApiError.badRequest('All fields are required');
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  // Validate password
  if (password.length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters long');
  }

  // Validate role - restrict to jobseeker/recruiter only (admin cannot be created via public register)
  if (!['jobseeker', 'recruiter'].includes(role)) {
    throw ApiError.badRequest('Invalid role selected');
  }

  // Check duplicate email
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw ApiError.conflict('Email already exists');
  }

  const otpRecord = await RegistrationOtp.findOne({ email: normalizedEmail }).select('+otpHash');
  if (!otpRecord) {
    throw ApiError.badRequest('Please request OTP first');
  }

  if (otpRecord.expiresAt < new Date()) {
    await RegistrationOtp.deleteOne({ _id: otpRecord._id });
    throw ApiError.badRequest('OTP has expired. Please request a new OTP');
  }

  if (otpRecord.attempts >= MAX_REGISTRATION_OTP_ATTEMPTS) {
    await RegistrationOtp.deleteOne({ _id: otpRecord._id });
    throw ApiError.badRequest('Maximum OTP attempts exceeded. Please request a new OTP');
  }

  const submittedOtpHash = hashToken(String(otp).trim());
  if (submittedOtpHash !== otpRecord.otpHash) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    throw ApiError.badRequest('Invalid OTP');
  }

  // Generate email verification token
  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email: normalizedEmail,
    password,
    role,
    isEmailVerified: true
  });

  await RegistrationOtp.deleteOne({ _id: otpRecord._id });

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
    createdAt: user.createdAt
  };

  res.status(201).json(
    ApiResponse.created({
      user: userResponse,
      accessToken
    }, 'Registration successful')
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

  const normalizedEmail = String(email).trim().toLowerCase();

  // Find user (don't reveal if email exists)
  const user = await User.findOne({ email: normalizedEmail });
  
  // Always return same message for security
  const message = 'If an account with that email exists, a password reset link has been sent.';

  if (!user) {
    return res.json(
      ApiResponse.success(null, message)
    );
  }

  // OTP-based reset flow
  const otp = generateSixDigitOtp();
  const otpHash = hashToken(otp);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MS);

  await PasswordResetOtp.findOneAndUpdate(
    { email: normalizedEmail },
    {
      email: normalizedEmail,
      otpHash,
      expiresAt,
      attempts: 0,
      lastSentAt: new Date()
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  // Send reset OTP email (async, don't block response)
  setImmediate(async () => {
    try {
      await sendPasswordResetOtpEmail(normalizedEmail, otp, user.firstName || 'there');
    } catch (error) {
      console.error('Failed to send password reset OTP email:', error);
    }
  });

  res.json(
    ApiResponse.success(null, message)
  );
});

/**
 * Reset password with OTP
 */
const resetPasswordWithOtp = asyncHandler(async (req, res) => {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    throw ApiError.badRequest('Email, OTP and new password are required');
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  if (!password) {
    throw ApiError.badRequest('New password is required');
  }

  if (password.length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters long');
  }

  const user = await User.findOne({ email: normalizedEmail }).select('+refreshToken');

  if (!user) {
    throw ApiError.badRequest('Invalid OTP or email');
  }

  const otpRecord = await PasswordResetOtp.findOne({ email: normalizedEmail }).select('+otpHash');
  if (!otpRecord) {
    throw ApiError.badRequest('Please request OTP first');
  }

  if (otpRecord.expiresAt < new Date()) {
    await PasswordResetOtp.deleteOne({ _id: otpRecord._id });
    throw ApiError.badRequest('OTP has expired. Please request a new OTP');
  }

  if (otpRecord.attempts >= MAX_PASSWORD_RESET_OTP_ATTEMPTS) {
    await PasswordResetOtp.deleteOne({ _id: otpRecord._id });
    throw ApiError.badRequest('Maximum OTP attempts exceeded. Please request a new OTP');
  }

  const submittedOtpHash = hashToken(String(otp).trim());
  if (submittedOtpHash !== otpRecord.otpHash) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    throw ApiError.badRequest('Invalid OTP');
  }

  // Update password and clear reset fields
  user.password = password;
  user.refreshToken = undefined; // Invalidate all existing refresh tokens
  await user.save();

  await PasswordResetOtp.deleteOne({ _id: otpRecord._id });

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
  sendRegistrationOtp,
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPasswordWithOtp,
  getMe,
  verifyEmail
};
