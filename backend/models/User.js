const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
// const mongooseErrorPlugin = require('../utils/mongooseErrorPlugin');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: function () {
      return this.isNew;
    },
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },
  passwordHash: {
    type: String,
    select: false
  },
  role: {
    type: String,
    enum: {
      values: ['jobseeker', 'recruiter', 'admin'],
      message: 'Role must be one of: jobseeker, recruiter, admin'
    },
    default: 'jobseeker'
  },
  profile: {
    phone: {
      type: String,
      trim: true
    },
      experienceYears: {
        type: Number,
        min: 0,
        default: 0
      },
    location: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    resumeUrl: String,
    resumePublicId: String,
    avatarUrl: String,
    avatarPublicId: String,
    companyName: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    companyDescription: {
      type: String,
      maxlength: [2000, 'Company description cannot exceed 2000 characters']
    },
    skills: [{
      type: String,
      trim: true
    }],
    experience: [{
      title: String,
      company: String,
      startDate: Date,
      endDate: Date,
      current: Boolean,
      description: String
    }],
    education: [{
      degree: String,
      institution: String,
      startDate: Date,
      endDate: Date,
      current: Boolean
    }],
    socialLinks: {
      linkedin: String,
      github: String,
      portfolio: String
    }
  },
  preferences: {
    jobTypes: [{
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'remote']
    }],
    industries: [String],
    locations: [String],
    salaryRange: {
      min: Number,
      max: Number
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      applicationUpdates: { type: Boolean, default: true },
      newJobs: { type: Boolean, default: true }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: { type: String, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  refreshToken: { type: String, select: false },
  lastLogin: Date,
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.password, salt);
    
    // Discard plaintext password so it's not saved to the database
    this.password = undefined;
    
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    throw new Error('Password hash not found');
  }

  try {
    const result = await bcrypt.compare(candidatePassword, this.passwordHash);
    return result;
  } catch (error) {
    throw error;
  }
};

userSchema.methods.generatePasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });
userSchema.index({ 'profile.skills': 1 });
userSchema.index({ 'profile.location': 1 });
userSchema.index({ role: 1 });

// userSchema.plugin(mongooseErrorPlugin);

module.exports = mongoose.model('User', userSchema);
