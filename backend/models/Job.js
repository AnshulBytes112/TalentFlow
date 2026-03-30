const mongoose = require('mongoose');
// const mongooseErrorPlugin = require('../utils/mongooseErrorPlugin');

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
    enum: ['full-time', 'part-time', 'contract', 'internship', 'remote']
  },
  category: {
    type: String,
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
    enum: ['entry-level', 'mid-level', 'senior-level', 'executive']
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
    trim: true
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
    required: [true, 'Posted by is required']
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
jobSchema.virtual('isExpired').get(function () {
  return this.expiryDate < new Date();
});

// Method to increment view count
jobSchema.methods.incrementViewCount = function () {
  this.viewCount += 1;
  return this.save();
};

// Pre-find hook to filter out expired jobs
jobSchema.pre(/^find/, function (next) {
  // Only filter for active jobs queries
  if (this.getQuery().status === 'active') {
    this.find({ expiryDate: { $gt: new Date() } });
  }
  next();
});

// Static method to find active jobs with filters
jobSchema.statics.findActiveJobs = function (filters = {}) {
  const query = {
    status: 'active',
    expiryDate: { $gt: new Date() },
    ...filters
  };

  // Text search if search term is provided
  if (filters.search) {
    query.$text = { $search: filters.search };
    delete query.search;
  }

  // Location filter
  if (filters.location) {
    query.location = { $regex: filters.location, $options: 'i' };
  }

  // Job type filter
  if (filters.type) {
    query.type = filters.type;
  }

  // Category filter
  if (filters.category) {
    query.category = filters.category;
  }

  // Experience filter
  if (filters.experience) {
    query.experience = filters.experience;
  }

  // Skills filter (any of the provided skills)
  if (filters.skills && Array.isArray(filters.skills)) {
    query.skills = { $in: filters.skills };
  }

  // Salary range filter
  if (filters.minSalary) {
    query['salary.min'] = { $gte: filters.minSalary };
  }
  if (filters.maxSalary) {
    query['salary.max'] = { $lte: filters.maxSalary };
  }

  return this.find(query)
    .populate('postedBy', 'firstName lastName email')
    .sort({ featured: -1, createdAt: -1 });
};

// Apply mongoose error plugin
// jobSchema.plugin(mongooseErrorPlugin);

module.exports = mongoose.model('Job', jobSchema);
