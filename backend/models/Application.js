const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['applied', 'screening', 'interview', 'technical', 'offer', 'rejected', 'withdrawn'],
    default: 'applied'
  },
  stage: {
    type: String,
    enum: ['initial', 'screening', 'interview', 'technical', 'final', 'completed'],
    default: 'initial'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  resume: {
    url: {
      type: String,
      required: true
    },
    publicId: String,
    originalName: String
  },
  coverLetter: {
    type: String,
    maxlength: [2000, 'Cover letter cannot exceed 2000 characters']
  },
  portfolio: String,
  answers: [{
    question: String,
    answer: String
  }],
  notes: [{
    content: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  timeline: [{
    status: String,
    date: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  ratings: {
    overall: {
      type: Number,
      min: 1,
      max: 5
    },
    experience: {
      type: Number,
      min: 1,
      max: 5
    },
    skills: {
      type: Number,
      min: 1,
      max: 5
    },
    culture: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  interviewSchedule: [{
    type: {
      type: String,
      enum: ['phone', 'video', 'onsite', 'technical'],
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    interviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    location: String,
    meetingUrl: String,
    notes: String,
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled'
    }
  }],
  feedback: [{
    interviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    strengths: [String],
    weaknesses: [String],
    comments: String,
    recommendation: {
      type: String,
      enum: ['strong-no', 'no', 'maybe', 'yes', 'strong-yes']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  offer: {
    salary: Number,
    bonus: Number,
    equity: String,
    startDate: Date,
    benefits: [String],
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired'],
      default: 'pending'
    },
    expiryDate: Date,
    sentAt: Date
  },
  source: {
    type: String,
    enum: ['portal', 'referral', 'linkedin', 'indeed', 'company-website', 'other'],
    default: 'portal'
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: [{
    type: String,
    trim: true
  }],
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ applicant: 1 });
applicationSchema.index({ job: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ stage: 1 });
applicationSchema.index({ priority: 1 });
applicationSchema.index({ 'interviewSchedule.date': 1 });
applicationSchema.index({ createdAt: -1 });

// Virtual for checking if application is active
applicationSchema.virtual('isActive').get(function() {
  return !this.isArchived && this.status !== 'withdrawn' && this.status !== 'rejected';
});

// Method to add timeline entry
applicationSchema.methods.addTimelineEntry = function(status, note, updatedBy) {
  this.timeline.push({
    status,
    note,
    updatedBy,
    date: new Date()
  });
  return this.save();
};

// Method to update status
applicationSchema.methods.updateStatus = function(newStatus, note, updatedBy) {
  this.status = newStatus;
  return this.addTimelineEntry(newStatus, note, updatedBy);
};

// Pre-save middleware to update timeline
applicationSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({
      status: this.status,
      date: new Date(),
      updatedBy: this._updateUpdatedBy || this.applicant
    });
  }
  next();
});

module.exports = mongoose.model('Application', applicationSchema);
