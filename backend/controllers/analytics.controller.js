const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose');

/**
 * Get recruiter specific analytics
 */
exports.getRecruiterAnalytics = asyncHandler(async (req, res) => {
  const recruiterId = req.user._id;

  // 1. Basic Job Stats
  const jobStats = await Job.aggregate([
    { $match: { postedBy: recruiterId } },
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        activeJobs: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        closedJobs: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        expiredJobs: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } }
      }
    }
  ]);

  const stats = jobStats[0] || { totalJobs: 0, activeJobs: 0, closedJobs: 0, expiredJobs: 0 };

  // 2. Application Stats
  const applicationStats = await Application.aggregate([
    {
      $lookup: {
        from: 'jobs',
        localField: 'job',
        foreignField: '_id',
        as: 'jobData'
      }
    },
    { $unwind: '$jobData' },
    { $match: { 'jobData.postedBy': recruiterId } },
    {
      $facet: {
        byStage: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        overTime: [
          {
            $match: {
              createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ],
        totals: [
          {
            $group: {
              _id: null,
              totalApplications: { $sum: 1 },
              totalOffers: { $sum: { $cond: [{ $eq: ['$status', 'offer'] }, 1, 0] } }
            }
          }
        ]
      }
    }
  ]);

  const appData = applicationStats[0] || { byStage: [], overTime: [], totals: [{ totalApplications: 0, totalOffers: 0 }] };
  const totalApps = appData.totals[0]?.totalApplications || 0;
  const totalOffers = appData.totals[0]?.totalOffers || 0;

  // 2.1 Default Stages with 0 counts
  const defaultStages = {
    applied: 0,
    screening: 0,
    interview: 0,
    technical: 0,
    offer: 0,
    rejected: 0,
    withdrawn: 0
  };
  const applicationsByStage = { ...defaultStages, ...Object.fromEntries(appData.byStage.map(s => [s._id, s.count])) };

  // 3. Top 5 Jobs by Applicant Count
  const topJobs = await Job.find({ postedBy: recruiterId })
    .sort({ applicationCount: -1 })
    .limit(5)
    .select('title applicationCount viewCount status');

  // 4. Avg Time to Hire (Applied to Offer)
  const timeToHire = await Application.aggregate([
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
      $match: { 
        'jobData.postedBy': recruiterId,
        status: 'offer'
      } 
    },
    {
      $project: {
        offerEntry: {
          $filter: {
            input: '$timeline',
            as: 't',
            cond: { $eq: ['$$t.status', 'offer'] }
          }
        },
        createdAt: 1
      }
    },
    {
      $project: {
        offerDate: { $arrayElemAt: ['$offerEntry.date', 0] },
        createdAt: 1
      }
    },
    {
      $project: {
        timeDiff: { $subtract: [{ $ifNull: ['$offerDate', '$updatedAt'] }, '$createdAt'] }
      }
    },
    {
      $group: {
        _id: null,
        avgTime: { $avg: '$timeDiff' }
      }
    }
  ]);

  const avgTimeDays = timeToHire[0] ? Math.round(timeToHire[0].avgTime / (1000 * 60 * 60 * 24)) : 0;

  res.status(200).json({
    status: 'success',
    data: {
      totalJobsPosted: stats.totalJobs,
      activeJobs: stats.activeJobs,
      closedJobs: stats.closedJobs,
      expiredJobs: stats.expiredJobs,
      totalApplicationsReceived: totalApps,
      applicationsByStage,
      applicationsOverTime: appData.overTime,
      topJobs,
      avgTimeToHire: avgTimeDays,
      conversionRate: totalApps > 0 ? ((totalOffers / totalApps) * 100).toFixed(2) : 0
    }
  });
});

/**
 * Get platform-wide admin analytics
 */
exports.getAdminAnalytics = asyncHandler(async (req, res) => {
  // 1. User Stats
  const userStats = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);

  const userCounts = Object.fromEntries(userStats.map(s => [s._id, s.count]));
  const totalUsers = Object.values(userCounts).reduce((a, b) => a + b, 0);

  // 2. Job & Application Totals
  const totalJobs = await Job.countDocuments();
  const activeJobs = await Job.countDocuments({ status: 'active' });
  const totalApplications = await Application.countDocuments();

  // 3. New Users Last 30 Days
  const newUsersLast30 = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // 4. Applications Last 30 Days
  const appsLast30 = await Application.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // 5. Top Recruiters
  const topRecruiters = await Application.aggregate([
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
        applicationCount: { $sum: 1 }
      }
    },
    { $sort: { applicationCount: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userData'
      }
    },
    { $unwind: '$userData' },
    {
      $project: {
        name: { $concat: ['$userData.firstName', ' ', '$userData.lastName'] },
        company: '$userData.profile.companyName',
        applicationCount: 1
      }
    }
  ]);

  // 6. Top Skills in Demand
  const topSkills = await Job.aggregate([
    { $match: { status: 'active' } },
    { $unwind: '$skills' },
    { $group: { _id: '$skills', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  // 7. Platform Conversion Rate
  const offersCount = await Application.countDocuments({ status: 'offer' });

  res.status(200).json({
    status: 'success',
    data: {
      totalUsers,
      totalJobseekers: userCounts['jobseeker'] || 0,
      totalRecruiters: userCounts['recruiter'] || 0,
      totalJobs,
      activeJobs,
      totalApplications,
      newUsersLast30Days: newUsersLast30,
      applicationsLast30Days: appsLast30,
      topRecruiters,
      topSkillsInDemand: topSkills,
      platformConversionRate: totalApplications > 0 ? ((offersCount / totalApplications) * 100).toFixed(2) : 0
    }
  });
});
