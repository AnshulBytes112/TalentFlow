const cron = require('node-cron');
const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');
const { notifyJobExpired } = require('./notificationService');
const { sendJobExpiryReminder, sendPendingApplicationsReminder } = require('./emailService');
const { emitToUser } = require('./socketService');

/**
 * 1. Expire Jobs (Every day at midnight)
 * Finds jobs whose deadline has passed, updates status, and notifies recruiters.
 */
cron.schedule('0 0 * * *', async () => {
  console.log('🕐 Running daily job expiry cron job...');
  
  try {
    const expiredJobs = await Job.find({
      status: 'active',
      expiryDate: { $lt: new Date() }
    }).populate('postedBy', 'email firstName lastName');

    if (expiredJobs.length > 0) {
      const expiredIds = expiredJobs.map(job => job._id);
      
      // 1. Perform ATOMIC update for all found jobs
      await Job.updateMany(
        { _id: { $in: expiredIds } },
        { $set: { status: 'expired' } }
      );

      // 2. Group jobs by recruiter for bulk email and notifications
      const recruiterJobs = {};
      
      for (const job of expiredJobs) {
        const recruiterId = job.postedBy._id.toString();
        if (!recruiterJobs[recruiterId]) {
          recruiterJobs[recruiterId] = {
            user: job.postedBy,
            jobs: []
          };
        }
        recruiterJobs[recruiterId].jobs.push(job);

        // 3. Create in-app notification & emit socket event (non-blocking)
        notifyJobExpired(job).catch(err => console.error(`Error notifying for job ${job._id}:`, err));
        emitToUser(recruiterId, 'job:expired', {
          jobId: job._id,
          title: job.title
        });
      }

      // 3. Send summary email to each recruiter
      for (const rid in recruiterJobs) {
        const { user, jobs } = recruiterJobs[rid];
        await sendJobExpiryReminder(user, jobs);
      }

      console.log(`✅ Processed ${expiredJobs.length} expired jobs`);
    } else {
      console.log('✅ No jobs to expire');
    }
  } catch (error) {
    console.error('❌ Error in job expiry cron job:', error);
  }
});

/**
 * 2. Stagnant Application Reminders (Every Monday at 9:00 AM)
 * Notifies recruiters of applications stuck in 'applied' stage for > 7 days.
 */
cron.schedule('0 9 * * 1', async () => {
  console.log('📧 Running weekly pending applications reminder...');
  
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Find applications in 'applied' stage for over 7 days
    const stagnantApps = await Application.aggregate([
      { 
        $match: { 
          status: 'applied',
          createdAt: { $lt: sevenDaysAgo }
        } 
      },
      {
        $lookup: {
          from: 'jobs',
          localField: 'job',
          foreignField: '_id',
          as: 'jobData'
        }
      },
      { $unwind: '$jobData' },
      {
        $group: {
          _id: '$jobData.postedBy',
          count: { $sum: 1 }
        }
      }
    ]);

    for (const group of stagnantApps) {
      const recruiter = await User.findById(group._id);
      if (recruiter && recruiter.email) {
        await sendPendingApplicationsReminder(recruiter, group.count);
        console.log(`📩 Sent reminder to ${recruiter.email} for ${group.count} pending applications`);
      }
    }
  } catch (error) {
    console.error('❌ Error in pending applications reminder cron job:', error);
  }
});

/**
 * 3. Weekly Cleanup (Existing - Every Sunday at midnight)
 */
cron.schedule('0 0 * * 0', async () => {
  console.log('🧹 Running weekly cleanup of old withdrawn applications...');
  
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await Application.deleteMany({
      status: 'withdrawn',
      updatedAt: { $lt: thirtyDaysAgo }
    });
    
    console.log(`✅ Cleaned up ${result.deletedCount} old withdrawn applications`);
  } catch (error) {
    console.error('❌ Error in application cleanup cron job:', error);
  }
});

console.log('⏰ Background Cron Jobs Initialized');
