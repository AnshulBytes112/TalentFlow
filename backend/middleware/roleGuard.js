const { ApiError } = require('../utils/ApiError');

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Access denied. Authentication required.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Access denied. Insufficient permissions.'));
    }

    next();
  };
};

// Resource owner check (user can only access their own resources)
const checkOwnership = (resourceField = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Access denied. Authentication required.'));
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params.userId || req.body[resourceField] || req.query[resourceField];
    
    if (resourceUserId && resourceUserId.toString() !== req.user._id.toString()) {
      return next(new ApiError(403, 'Access denied. You can only access your own resources.'));
    }

    next();
  };
};

// Job ownership check (recruiter can only access their own jobs)
const checkJobOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Access denied. Authentication required.'));
    }

    // Admin can access any job
    if (req.user.role === 'admin') {
      return next();
    }

    const Job = require('../models/Job');
    const jobId = req.params.id || req.params.jobId || req.body.job;
    
    if (!jobId) {
      return next(new ApiError(400, 'Job ID is required.'));
    }

    const job = await Job.findById(jobId);
    
    if (!job) {
      return next(new ApiError(404, 'Job not found.'));
    }

    // Recruiter can only access their own jobs
    if (req.user.role === 'recruiter' && job.postedBy.toString() !== req.user._id.toString()) {
      return next(new ApiError(403, 'Access denied. You can only access your own jobs.'));
    }

    // Attach job to request for later use
    req.job = job;
    next();
  } catch (error) {
    next(error);
  }
};

// Application access control
const checkApplicationAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Access denied. Authentication required.'));
    }

    // Admin can access any application
    if (req.user.role === 'admin') {
      return next();
    }

    const Application = require('../models/Application');
    const applicationId = req.params.id || req.params.applicationId || req.body.application;
    
    if (!applicationId) {
      return next(new ApiError(400, 'Application ID is required.'));
    }

    const application = await Application.findById(applicationId).populate('job applicant');
    
    if (!application) {
      return next(new ApiError(404, 'Application not found.'));
    }

    // Job seeker can only access their own applications
    if (req.user.role === 'jobseeker' && application.applicant._id.toString() !== req.user._id.toString()) {
      return next(new ApiError(403, 'Access denied. You can only access your own applications.'));
    }

    // Recruiter can only access applications for their jobs
    if (req.user.role === 'recruiter' && application.job.postedBy.toString() !== req.user._id.toString()) {
      return next(new ApiError(403, 'Access denied. You can only access applications for your jobs.'));
    }

    // Attach application to request for later use
    req.application = application;
    next();
  } catch (error) {
    next(error);
  }
};

// Subscription/plan check (for premium features)
const checkSubscription = (requiredPlan = 'basic') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Access denied. Authentication required.'));
    }

    // Admin bypasses subscription checks
    if (req.user.role === 'admin') {
      return next();
    }

    const userPlan = req.user.subscription?.plan || 'basic';
    const planHierarchy = {
      'basic': 0,
      'premium': 1,
      'enterprise': 2
    };

    if (planHierarchy[userPlan] < planHierarchy[requiredPlan]) {
      return next(new ApiError(403, `This feature requires a ${requiredPlan} subscription.`));
    }

    next();
  };
};

module.exports = {
  authorize,
  checkOwnership,
  checkJobOwnership,
  checkApplicationAccess,
  checkSubscription,
};
