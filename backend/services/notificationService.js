const Notification = require('../models/Notification');
const { emitToUser } = require('./socketService');

/**
 * Create a new notification and emit real-time event
 */
const createNotification = async (data) => {
  try {
    const notification = await Notification.create({
      recipient: data.recipient,
      sender: data.sender,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data || {},
      status: 'unread',
      priority: data.priority || 'medium'
    });

    // Emit real-time notification to user
    emitToUser(data.recipient, 'notification:new', {
      id: notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      createdAt: notification.createdAt,
      data: notification.data
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Notify applicant of stage change
 */
const notifyStageChange = async (application, newStage) => {
  return await createNotification({
    recipient: application.applicant,
    type: 'application_status_update',
    title: 'Application Status Updated',
    message: `Your application status for ${application.job.title} has been updated to ${newStage}.`,
    data: {
      applicationId: application._id,
      jobId: application.job._id,
      stage: newStage
    },
    priority: 'high'
  });
};

/**
 * Notify recruiter of new application
 */
const notifyNewApplication = async (job, applicant) => {
  return await createNotification({
    recipient: job.postedBy,
    type: 'application_received',
    title: 'New Application Received',
    message: `${applicant.firstName} ${applicant.lastName} applied for ${job.title}.`,
    data: {
      jobId: job._id,
      applicantId: applicant._id
    }
  });
};

/**
 * Notify recruiter of expired job
 */
const notifyJobExpired = async (job) => {
  return await createNotification({
    recipient: job.postedBy,
    type: 'deadline_reminder',
    title: 'Job Post Expired',
    message: `Your job posting for ${job.title} has expired.`,
    data: {
      jobId: job._id
    },
    priority: 'medium'
  });
};

module.exports = {
  createNotification,
  notifyStageChange,
  notifyNewApplication,
  notifyJobExpired,
  notifyWithdrawal
};
