const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    maxlength: [5000, 'Job description cannot exceed 5000 characters']
  },
  company: {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true
    },
    logo: {
      url: String,
      publicId: String
    },
    website: String,
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
    },
    industry: String,
    description: String
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'],
    required: [true, 'Job type is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'engineering',
      'design',
      'marketing',
      'sales',
      'customer-support',
      'product',
      'data-science',
      'hr',
      'finance',
      'operations',
      'other'
    ]
  },
  experience: {
    type: String,
    enum: ['entry-level', 'mid-level', 'senior-level', 'executive'],
    required: [true, 'Experience level is required']
  },
  salary: {
    min: {
      type: Number,
      min: 0
    },
    max: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    period: {
      type: String,
      enum: ['hourly', 'monthly', 'yearly'],
      default: 'yearly'
    }
  },
  skills: [{
    type: String,
    trim: true,
    required: true
  }],
  responsibilities: [{
    type: String,
    trim: true
  }],
  requirements: [{
    type: String,
    trim: true
  }],
  benefits: [{
    type: String,
    trim: true
  }],
  applicationMethod: {
    type: String,
    enum: ['portal', 'email', 'external'],
    default: 'portal'
  },
  applicationEmail: String,
  applicationUrl: String,
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'closed', 'paused'],
    default: 'active'
  },
  featured: {
    type: Boolean,
    default: false
  },
  applicationCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  expiryDate: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  },
  tags: [{
    type: String,
    trim: true
  }],
}, {
  timestamps: true
});

// Index for search
jobSchema.index({ title: 'text', description: 'text', 'company.name': 'text' });
jobSchema.index({ location: 1 });
jobSchema.index({ type: 1 });
jobSchema.index({ category: 1 });
jobSchema.index({ experience: 1 });
jobSchema.index({ 'salary.min': 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ postedBy: 1 });
jobSchema.index({ featured: 1 });
jobSchema.index({ expiryDate: 1 });

// Virtual for checking if job is expired
jobSchema.virtual('isExpired').get(function() {
  return this.expiryDate < new Date();
});

// Method to increment view count
jobSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Method to increment application count
jobSchema.methods.incrementApplicationCount = function() {
  this.applicationCount += 1;
  return this.save();
};

module.exports = mongoose.model('Job', jobSchema);
