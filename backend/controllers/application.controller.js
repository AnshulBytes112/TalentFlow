const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const Notification = require('../models/Notification');
const path = require('path');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { VALID_STAGE_TRANSITIONS, NOTIFICATION_TYPES } = require('../utils/constants');

const { notifyStageChange, notifyNewApplication, notifyWithdrawal } = require('../services/notificationService');
const { emitToUser } = require('../services/socketService');
const emailService = require('../services/emailService');

const getApiBaseUrl = (req) => process.env.API_URL || `${req.protocol}://${req.get('host')}`;

const normalizeResumeUrl = (req, rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  const trimmed = rawUrl.trim();
  const apiBaseUrl = getApiBaseUrl(req);

  // Cloudinary/external links are already web accessible.
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Handle accidental file:// storage.
  if (/^file:\/\//i.test(trimmed)) {
    const normalizedPath = trimmed.replace(/^file:\/+/i, '').replace(/\\/g, '/');
    const fileName = path.basename(normalizedPath);
    return fileName ? `${apiBaseUrl}/uploads/${fileName}` : null;
  }

  if (trimmed.startsWith('/uploads/')) {
    return `${apiBaseUrl}${trimmed}`;
  }

  // Convert absolute/relative disk paths that include an uploads segment.
  const normalized = trimmed.replace(/\\/g, '/');
  if (normalized.includes('/uploads/')) {
    const fileName = path.basename(normalized);
    return fileName ? `${apiBaseUrl}/uploads/${fileName}` : null;
  }

  return trimmed;
};

const normalizeApplicant = (applicant) => {
  if (!applicant) {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      skills: [],
      experience: '',
      bio: '',
      avatar: ''
    };
  }

  const profile = applicant.profile || {};
  const experience = Array.isArray(profile.experience) && profile.experience.length > 0
    ? profile.experience[0]?.title || ''
    : '';

  return {
    firstName: applicant.firstName || '',
    lastName: applicant.lastName || '',
    email: applicant.email || '',
    phone: profile.phone || '',
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    experience,
    bio: profile.bio || '',
    avatar: profile.avatarUrl || ''
  };
};

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

  // Check deadline not passed (schema field is 'expiryDate', not 'deadline')
  if (job.expiryDate < new Date()) {
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
  let resumePublicId = null;

  if (req.file) {
    const uploadedPath = req.file.path || req.file.url || req.file.secure_url;
    resumeUrl = normalizeResumeUrl(req, uploadedPath);
    resumePublicId = req.file.filename || req.file.public_id || null;
  } else if (req.user.profile?.resumeUrl) {
    resumeUrl = normalizeResumeUrl(req, req.user.profile.resumeUrl);
    resumePublicId = req.user.profile?.resumePublicId || null;
  } else {
    throw ApiError.badRequest('Resume is required to apply');
  }

  if (!resumeUrl) {
    throw ApiError.badRequest('Resume upload failed. Please re-upload and try again');
  }

  // Create application with stage "initial"
  const application = await Application.create({
    job: jobId,
    applicant: req.user._id,
    stage: 'initial',
    coverLetter,
    resume: {
      url: resumeUrl,
      publicId: resumePublicId,
      originalName: req.file?.originalname || 'resume'
    }
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

  // Send confirmation email to applicant (non-blocking)
  setImmediate(async () => {
    try {
      await emailService.sendApplicationReceived(req.user, job);
    } catch (error) {
      console.error('Failed to send application confirmation email:', error.message);
      // Don't throw - email failure shouldn't block application creation
    }
  });

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
  const rawCurrentStage = application.status || application.stage || 'applied';
  const stageAliases = {
    initial: 'applied',
    final: 'offer',
    completed: 'offer'
  };
  const currentStage = stageAliases[rawCurrentStage] || rawCurrentStage;
  const validTransitions = VALID_STAGE_TRANSITIONS[currentStage] || [];

  if (!validTransitions.includes(stage)) {
    throw ApiError.badRequest(`Invalid stage transition from ${currentStage} to ${stage}. Valid transitions: ${validTransitions.join(', ')}`);
  }

  // Status is the canonical field used across recruiter and jobseeker views.
  application.status = stage;
  application.timeline.push({
    status: stage,
    date: new Date(),
    updatedBy: req.user._id,
    note: note || `Stage updated to ${stage}`
  });

  await application.save();

  // Keep stage updates successful even if notifications/email providers fail.
  try {
    await notifyStageChange(application, stage);
  } catch (error) {
    console.error('Failed to create stage change notification:', error.message);
  }

  try {
    emitToUser(application.applicant._id, 'application:stage_changed', {
      applicationId: application._id,
      jobId: application.job._id,
      jobTitle: application.job.title,
      newStage: stage
    });
  } catch (error) {
    console.error('Failed to emit stage change socket event:', error.message);
  }

  try {
    if (stage === 'offer') {
      await emailService.sendOfferEmail(application.applicant, application.job);
    } else if (stage === 'rejected') {
      await emailService.sendRejectionEmail(application.applicant, application.job, note);
    } else {
      await emailService.sendStageUpdate(application.applicant, application.job, stage, note);
    }
  } catch (error) {
    console.error('Failed to send stage update email:', error.message);
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
  const currentStatus = application.status || application.stage || 'applied';
  const terminalStages = ['offer', 'rejected', 'withdrawn'];
  if (terminalStages.includes(currentStatus)) {
    throw ApiError.badRequest(`Cannot withdraw application in ${currentStatus} stage`);
  }

  application.status = 'withdrawn';
  application.timeline.push({
    status: 'withdrawn',
    date: new Date(),
    updatedBy: req.user._id,
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
    query.status = stage;
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

  const normalizedApplications = applications.map((application) => ({
    ...application.toObject(),
    stage: application.status || application.stage || 'applied',
    resumeUrl: normalizeResumeUrl(req, application.resumeUrl || application.resume?.url || null)
  }));

  const total = await Application.countDocuments(query);

  res.json(
    ApiResponse.paginated(normalizedApplications, {
      page: pageNum,
      limit: limitNum,
      total
    })
  );
});

const getRecruiterRecentApplications = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const limitNum = Math.min(parseInt(limit, 10) || 10, 50);

  const recruiterJobs = await Job.find({ postedBy: req.user._id }).select('_id title');
  const recruiterJobIds = recruiterJobs.map((job) => job._id);
  const jobTitleMap = new Map(recruiterJobs.map((job) => [job._id.toString(), job.title]));

  if (recruiterJobIds.length === 0) {
    return res.json(ApiResponse.success([]));
  }

  const applications = await Application.find({ job: { $in: recruiterJobIds } })
    .populate('applicant', 'firstName lastName email profile')
    .sort({ createdAt: -1 })
    .limit(limitNum);

  const normalized = applications.map((application) => ({
    ...application.toObject(),
    applicant: normalizeApplicant(application.applicant),
    job: {
      _id: application.job,
      title: jobTitleMap.get(application.job.toString()) || 'Untitled Job'
    },
    stage: application.status || application.stage || 'applied',
    shortlisted: Boolean(application.isShortlisted),
    resumeUrl: normalizeResumeUrl(
      req,
      application.resumeUrl || application.resume?.url || application.applicant?.profile?.resumeUrl || null
    ),
    recruiterNote: Array.isArray(application.notes) && application.notes.length > 0
      ? application.notes[application.notes.length - 1]?.content
      : ''
  }));

  res.json(ApiResponse.success(normalized));
});

const getRecruiterPipeline = asyncHandler(async (req, res) => {
  const recruiterJobs = await Job.find({ postedBy: req.user._id }).select('_id title company');
  const recruiterJobIds = recruiterJobs.map((job) => job._id);
  const jobsMap = new Map(
    recruiterJobs.map((job) => [
      job._id.toString(),
      {
        _id: job._id,
        title: job.title,
        company: job.company?.name || null
      }
    ])
  );

  if (recruiterJobIds.length === 0) {
    return res.json(ApiResponse.success([]));
  }

  const applications = await Application.find({ job: { $in: recruiterJobIds } })
    .populate('applicant', 'firstName lastName email profile')
    .sort({ createdAt: -1 });

  const normalized = applications.map((application) => ({
    ...application.toObject(),
    applicant: normalizeApplicant(application.applicant),
    job: jobsMap.get(application.job.toString()) || { _id: application.job, title: 'Untitled Job', company: null },
    stage: application.status || application.stage || 'applied',
    appliedAt: application.createdAt,
    shortlisted: Boolean(application.isShortlisted),
    recruiterNote: Array.isArray(application.notes) && application.notes.length > 0
      ? application.notes[application.notes.length - 1]?.content
      : '',
    resumeUrl: normalizeResumeUrl(
      req,
      application.resumeUrl || application.resume?.url || application.applicant?.profile?.resumeUrl || null
    )
  }));

  res.json(ApiResponse.success(normalized));
});

const updateApplicationNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  const application = await Application.findById(id).populate('job');
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  if (application.job.postedBy.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only manage applications for your jobs');
  }

  const trimmedNote = (note || '').trim();
  if (!trimmedNote) {
    throw ApiError.badRequest('Note is required');
  }

  if (!Array.isArray(application.notes)) {
    application.notes = [];
  }

  application.notes.push({
    content: trimmedNote,
    addedBy: req.user._id,
    createdAt: new Date()
  });

  await application.save();

  res.json(ApiResponse.success(application, 'Application note updated successfully'));
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

  const normalizedApplications = applications.map((application) => {
    const appObj = application.toObject();
    return {
      ...appObj,
      stage: appObj.status || appObj.stage || 'applied',
      resume: {
        ...(appObj.resume || {}),
        url: normalizeResumeUrl(req, appObj.resume?.url || appObj.resumeUrl || appObj.applicant?.profile?.resumeUrl || null)
      }
    };
  });

  res.json(
    ApiResponse.paginated(normalizedApplications, {
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

  const normalizedApplication = application.toObject();
  normalizedApplication.resume = {
    ...(normalizedApplication.resume || {}),
    url: normalizeResumeUrl(
      req,
      normalizedApplication.resume?.url || normalizedApplication.resumeUrl || normalizedApplication.applicant?.profile?.resumeUrl || null
    )
  };

  res.json(
    ApiResponse.success(normalizedApplication)
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
  getRecruiterRecentApplications,
  getRecruiterPipeline,
  updateApplicationNote,
  getJobApplications,
  toggleShortlist,
  getApplicationById,
  getAllApplications
};
