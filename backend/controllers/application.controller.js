const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { VALID_STAGE_TRANSITIONS, NOTIFICATION_TYPES } = require('../utils/constants');

const { notifyStageChange, notifyNewApplication, notifyWithdrawal } = require('../services/notificationService');
const { emitToUser } = require('../services/socketService');
const emailService = require('../services/emailService');

/**
 * @swagger
 * /api/applications/{jobId}:
 *   post:
 *     summary: Apply to a job
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               coverLetter:
 *                 type: string
 *               resume:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Application submitted successfully
 */
const applyToJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { coverLetter } = req.body;

  // Check job exists and is active
  const job = await Job.findById(jobId);
  if (!job) {
    throw ApiError.notFound('Job not found');
  }

  if (job.status !== 'active') {
    throw ApiError.badRequest('Job is not accepting applications');
  }

  // Check deadline not passed
  if (job.deadline < new Date()) {
    throw ApiError.badRequest('Application deadline has passed');
  }

  // Check user hasn't already applied (compound index handles DB level, but check early for better error)
  const existingApplication = await Application.findOne({
    job: jobId,
    applicant: req.user._id
  });

  if (existingApplication) {
    throw ApiError.conflict('You have already applied to this job');
  }

  // Check resume exists on profile OR uploaded in this request
  let resumeUrl;

  if (req.file) {
    resumeUrl = req.file.path;
  } else if (req.user.profile?.resumeUrl) {
    resumeUrl = req.user.profile.resumeUrl;
  } else {
    throw ApiError.badRequest('Resume is required to apply');
  }

  // Create application with stage "applied" + first stageHistory entry
  const application = await Application.create({
    job: jobId,
    applicant: req.user._id,
    stage: 'applied',
    coverLetter,
    resumeUrl,
    stageHistory: [{
      stage: 'applied',
      date: new Date(),
      changedBy: req.user._id,
      note: 'Initial application'
    }]
  });

  // Increment job.applicantsCount using $inc
  await Job.findByIdAndUpdate(jobId, { $inc: { applicantsCount: 1 } });

  // Create notification for recruiter & emit socket event
  await notifyNewApplication(job, req.user);
  emitToUser(job.postedBy, 'application:new', {
    jobId: job._id,
    applicationId: application._id,
    applicantName: `${req.user.firstName} ${req.user.lastName}`
  });

  // Send confirmation email to applicant
  await emailService.sendApplicationReceived(req.user, job);

  res.status(201).json(
    ApiResponse.created(application, 'Application submitted successfully')
  );
});

/**
 * @swagger
 * /api/applications/{id}/stage:
 *   patch:
 *     summary: Update application stage
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stage:
 *                 type: string
 *                 enum: [applied, screening, interview, offer, rejected, withdrawn]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application stage updated successfully
 */
const updateApplicationStage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { stage, note } = req.body;

  const application = await Application.findById(id).populate('job applicant');
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  // Recruiter must own the job this application belongs to
  if (application.job.postedBy.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only manage applications for your jobs');
  }

  // Validate stage transition using VALID_TRANSITIONS map
  const currentStage = application.stage;
  const validTransitions = VALID_STAGE_TRANSITIONS[currentStage] || [];

  if (!validTransitions.includes(stage)) {
    throw ApiError.badRequest(`Invalid stage transition from ${currentStage} to ${stage}. Valid transitions: ${validTransitions.join(', ')}`);
  }

  // Update stage + push to stageHistory with changedBy + optional note
  application.stage = stage;
  application.stageHistory.push({
    stage,
    date: new Date(),
    changedBy: req.user._id,
    note: note || `Stage updated to ${stage}`
  });

  await application.save();

  // Create notification for applicant & emit socket event
  await notifyStageChange(application, stage);
  emitToUser(application.applicant._id, 'application:stage_changed', {
    applicationId: application._id,
    jobId: application.job._id,
    jobTitle: application.job.title,
    newStage: stage
  });

  // Trigger emails based on stage
  if (stage === 'offer') {
    await emailService.sendOfferEmail(application.applicant, application.job);
  } else if (stage === 'rejected') {
    await emailService.sendRejectionEmail(application.applicant, application.job, note);
  } else {
    await emailService.sendStageUpdate(application.applicant, application.job, stage, note);
  }

  res.json(
    ApiResponse.success(application, 'Application stage updated successfully')
  );
});

/**
 * @swagger
 * /api/applications/{id}/withdraw:
 *   patch:
 *     summary: Withdraw an application
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application withdrawn successfully
 */
const withdrawApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const application = await Application.findById(id).populate('job');
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  // Only applicant themselves can withdraw
  if (application.applicant.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only withdraw your own applications');
  }

  // Can only withdraw if stage is not "offer", "rejected", or already "withdrawn"
  const terminalStages = ['offer', 'rejected', 'withdrawn'];
  if (terminalStages.includes(application.stage)) {
    throw ApiError.badRequest(`Cannot withdraw application in ${application.stage} stage`);
  }

  // Set stage to "withdrawn" and push to stageHistory
  application.stage = 'withdrawn';
  application.stageHistory.push({
    stage: 'withdrawn',
    date: new Date(),
    changedBy: req.user._id,
    note: 'Application withdrawn by applicant'
  });

  await application.save();

  // Notify recruiter of withdrawal
  await notifyWithdrawal(application.job, req.user);
  emitToUser(application.job.postedBy, 'application:withdrawn', {
    applicationId: application._id,
    jobId: application.job._id,
    applicantName: `${req.user.firstName} ${req.user.lastName}`
  });

  // Decrement job.applicantsCount using $inc with -1
  await Job.findByIdAndUpdate(application.job._id, { $inc: { applicantsCount: -1 } });

  res.json(
    ApiResponse.success(application, 'Application withdrawn successfully')
  );
});

/**
 * @swagger
 * /api/applications/my:
 *   get:
 *     summary: Get my applications
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: stage
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of my applications
 */
const getMyApplications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, stage } = req.query;

  const query = { applicant: req.user._id };
  if (stage) {
    query.stage = stage;
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const applications = await Application.find(query)
    .populate({
      path: 'job',
      select: 'title location jobType workMode salaryMin salaryMax postedBy',
      populate: {
        path: 'postedBy',
        select: 'firstName lastName company'
      }
    })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Application.countDocuments(query);

  res.json(
    ApiResponse.paginated(applications, {
      page: pageNum,
      limit: limitNum,
      total
    })
  );
});

/**
 * @swagger
 * /api/jobs/{jobId}/applications:
 *   get:
 *     summary: Get all applications for a job
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: stage
 *         schema:
 *           type: string
 *       - in: query
 *         name: isShortlisted
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of applications for the job
 */
const getJobApplications = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { page = 1, limit = 10, stage, isShortlisted } = req.query;

  // Verify job belongs to recruiter
  const job = await Job.findById(jobId);
  if (!job) {
    throw ApiError.notFound('Job not found');
  }

  if (job.postedBy.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only view applications for your jobs');
  }

  const query = { job: jobId };
  if (stage) {
    query.stage = stage;
  }
  if (isShortlisted !== undefined) {
    query.isShortlisted = isShortlisted === 'true';
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const applications = await Application.find(query)
    .populate({
      path: 'applicant',
      select: 'firstName lastName email profile',
      populate: {
        path: 'profile',
        select: 'skills experience resumeUrl phone'
      }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Application.countDocuments(query);

  res.json(
    ApiResponse.paginated(applications, {
      page: pageNum,
      limit: limitNum,
      total
    })
  );
});

/**
 * @swagger
 * /api/applications/{id}/shortlist:
 *   patch:
 *     summary: Toggle shortlist status
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application shortlist status toggled
 */
const toggleShortlist = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const application = await Application.findById(id).populate('job');
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  // Recruiter must own the job
  if (application.job.postedBy.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only manage applications for your jobs');
  }

  // Toggle isShortlisted boolean
  application.isShortlisted = !application.isShortlisted;
  await application.save();

  res.json(
    ApiResponse.success(application, `Application ${application.isShortlisted ? 'shortlisted' : 'unshortlisted'} successfully`)
  );
});

/**
 * @swagger
 * /api/applications/{id}:
 *   get:
 *     summary: Get application by ID
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application details
 */
const getApplicationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const application = await Application.findById(id)
    .populate('job')
    .populate('applicant', 'firstName lastName email profile');

  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  // Jobseeker can only view their own application
  if (req.user.role === 'jobseeker' && application.applicant._id.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only view your own applications');
  }

  // Recruiter can only view applications for their jobs
  if (req.user.role === 'recruiter' && application.job.postedBy.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only view applications for your jobs');
  }

  // Admin can view any (already handled by role guard)

  res.json(
    ApiResponse.success(application)
  );
});

/**
 * @swagger
 * /api/applications:
 *   get:
 *     summary: Get all applications (Admin only)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: stage
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of all applications
 */
const getAllApplications = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    stage,
    job,
    recruiter,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const query = {};

  // Search by applicant name or job title
  if (search) {
    query.$or = [
      { 'applicant.firstName': { $regex: search, $options: 'i' } },
      { 'applicant.lastName': { $regex: search, $options: 'i' } },
      { 'job.title': { $regex: search, $options: 'i' } }
    ];
  }

  // Filter by stage
  if (stage) {
    query.stage = stage;
  }

  // Filter by job
  if (job) {
    query.job = job;
  }

  // Filter by recruiter
  if (recruiter) {
    query['job.postedBy'] = recruiter;
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const applications = await Application.find(query)
    .populate('job', 'title postedBy')
    .populate('applicant', 'firstName lastName email')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  const total = await Application.countDocuments(query);

  res.json(
    ApiResponse.paginated(applications, {
      page: pageNum,
      limit: limitNum,
      total
    })
  );
});

module.exports = {
  applyToJob,
  updateApplicationStage,
  withdrawApplication,
  getMyApplications,
  getJobApplications,
  toggleShortlist,
  getApplicationById,
  getAllApplications
};
