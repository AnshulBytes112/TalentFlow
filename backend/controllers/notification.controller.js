const Notification = require('../models/Notification');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/**
 * Get all notifications for the authenticated user
 */
exports.getMyNotifications = catchAsync(async (req, res, next) => {
  const { isRead, limit = 20, page = 1 } = req.query;
  const skip = (page - 1) * limit;

  const query = { 
    recipient: req.user._id,
    isDeleted: false
  };

  if (isRead !== undefined) {
    query.status = isRead === 'true' ? 'read' : 'unread';
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Notification.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: notifications.length,
    total,
    page: parseInt(page),
    data: {
      notifications
    }
  });
});

/**
 * Get unread notification count
 */
exports.getUnreadCount = catchAsync(async (req, res, next) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    status: 'unread',
    isDeleted: false
  });

  res.status(200).json({
    status: 'success',
    data: {
      count
    }
  });
});

/**
 * Mark a specific notification as read
 */
exports.markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      recipient: req.user._id
    },
    {
      status: 'read',
      readAt: Date.now()
    },
    { new: true }
  );

  if (!notification) {
    return next(new AppError('No notification found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      notification
    }
  });
});

/**
 * Mark all notifications as read for the user
 */
exports.markAllAsRead = catchAsync(async (req, res, next) => {
  await Notification.updateMany(
    {
      recipient: req.user._id,
      status: 'unread'
    },
    {
      status: 'read',
      readAt: Date.now()
    }
  );

  res.status(200).json({
    status: 'success',
    message: 'All notifications marked as read'
  });
});

/**
 * Soft delete a notification
 */
exports.deleteNotification = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      recipient: req.user._id
    },
    { isDeleted: true },
    { new: true }
  );

  if (!notification) {
    return next(new AppError('No notification found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});
