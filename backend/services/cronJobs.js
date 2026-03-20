const cron = require('node-cron');
const Job = require('../models/Job');
const Application = require('../models/Application');

// Run every day at midnight to expire jobs whose deadline has passed
cron.schedule('0 0 * * *', async () => {
  console.log('🕐 Running daily job expiry cron job...');
  
  try {
    const expiredJobs = await Job.updateMany(
      {
        status: 'active',
        expiryDate: { $lt: new Date() }
      },
      { 
        $set: { status: 'closed' },
        $currentDate: { updatedAt: true }
      }
    );

    if (expiredJobs.modifiedCount > 0) {
      console.log(`✅ Expired ${expiredJobs.modifiedCount} jobs`);
      
      // Optionally notify applicants of expired jobs
      const jobs = await Job.find({
        _id: { $in: expiredJobs.upsertedIds || [] }
      }).populate('postedBy', 'firstName lastName email');

      for (const job of jobs) {
        console.log(`📧 Job "${job.title}" expired. Posted by: ${job.postedBy.firstName} ${job.postedBy.lastName}`);
      }
    } else {
      console.log('✅ No jobs to expire');
    }
  } catch (error) {
    console.error('❌ Error in job expiry cron job:', error);
  }
});

// Run every week to clean up old withdrawn applications
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

// Run every month to update job statistics
cron.schedule('0 0 1 * *', async () => {
  console.log('📊 Running monthly job statistics update...');
  
  try {
    const stats = await Job.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgApplications: { $avg: '$applicationCount' },
          avgViews: { $avg: '$viewCount' }
        }
      }
    ]);
    
    console.log('📈 Monthly Job Statistics:', stats);
  } catch (error) {
    console.error('❌ Error in statistics cron job:', error);
  }
});

module.exports = {
  // Export for testing purposes
  expireJobs: async () => {
    const expiredJobs = await Job.updateMany(
      {
        status: 'active',
        expiryDate: { $lt: new Date() }
      },
      { 
        $set: { status: 'closed' },
        $currentDate: { updatedAt: true }
      }
    );
    return expiredJobs;
  },
  
  cleanupApplications: async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return await Application.deleteMany({
      status: 'withdrawn',
      updatedAt: { $lt: thirtyDaysAgo }
    });
  }
};
