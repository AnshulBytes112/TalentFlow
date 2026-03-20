const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },
  role: {
    type: String,
    enum: ['jobseeker', 'recruiter', 'admin'],
    default: 'jobseeker'
  },
  profile: {
    phone: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    resume: {
      url: String,
      publicId: String
    },
    profilePicture: {
      url: String,
      publicId: String
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
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name method
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Index for search
userSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });
userSchema.index({ 'profile.skills': 1 });
userSchema.index({ 'profile.location': 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
