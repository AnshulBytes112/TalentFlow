const mongoose = require('mongoose');
const mongooseErrorPlugin = require('../utils/mongooseErrorPlugin');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'application_received',
      'application_status_update',
      'application_viewed',
      'interview_scheduled',
      'interview_reminder',
      'offer_received',
      'job_recommended',
      'job_saved',
      'profile_viewed',
      'message',
      'system',
      'deadline_reminder'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  data: {
    // Store related data like job ID, application ID, etc.
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    url: String,
    actionText: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  channels: {
    inApp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'archived'],
    default: 'unread'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  scheduledFor: Date,
  sentAt: Date,
  readAt: Date,
  expiresAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for pagination and performance
notificationSchema.index({ recipient: 1, status: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ priority: 1 });

// Compound indexes for efficient pagination queries
notificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

// Virtual for checking if notification is expired
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Computed at read time, not stored - prevents stale data
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffTime = now - this.createdAt;
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return this.createdAt.toLocaleDateString();
  }
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Method to archive
notificationSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

// Static method to find unread notifications for user
notificationSchema.statics.findUnreadByUser = function(userId) {
  return this.find({
    recipient: userId,
    status: 'unread',
    isDeleted: false,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  }).sort({ createdAt: -1 });
};

// Static method to send notification (creates and optionally schedules)
notificationSchema.statics.sendNotification = function(notificationData) {
  const notification = new this(notificationData);
  
  // Set sentAt if not scheduled
  if (!notification.scheduledFor || notification.scheduledFor <= new Date()) {
    notification.sentAt = new Date();
  }
  
  return notification.save();
};

// Pre-save middleware to handle scheduled notifications
notificationSchema.pre('save', function(next) {
  if (this.scheduledFor && this.scheduledFor <= new Date() && !this.sentAt) {
    this.sentAt = new Date();
  }
  next();
});

// Apply mongoose error plugin
notificationSchema.plugin(mongooseErrorPlugin);

module.exports = mongoose.model('Notification', notificationSchema);
