const Job = require('../models/Job');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { JOB_STATUS, JOB_TYPES, JOB_CATEGORIES, EXPERIENCE_LEVELS, WORK_MODES } = require('../utils/constants');
const emailService = require('../services/emailService');
const { emitToUser } = require('../services/socketService');
const { notifyJobClosed, notifyJobUpdated } = require('../services/notificationService');

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create a new job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, requirements, location, jobType, workMode, deadline, companyName, category, experience]
 *             properties:
 *               title: {type: string}
 *               description: {type: string}
 *               requirements: {type: array, items: {type: string}}
 *               skills: {type: array, items: {type: string}}
 *               location: {type: string}
 *               jobType: {type: string, enum: [full-time, part-time, contract, internship]}
 *               workMode: {type: string, enum: [remote, onsite, hybrid]}
 *               salaryMin: {type: number}
 *               salaryMax: {type: number}
 *               deadline: {type: string, format: date-time}
 *               companyName: {type: string}
 *               category: {type: string}
 *               experience: {type: string}
 *     responses:
 *       201:
 *         description: Job created successfully as draft
 */
const createJob = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    requirements,
    skills,
    location,
    jobType,
    salaryMin,
    salaryMax,
    currency,
    deadline,
    companyDescription,
    benefits,
    companyName,
    category,
    experience,
    status,
    workMode,
    isUnpaid
  } = req.body;

  // Validate required fields
  if (!title || !description || !requirements || !location || !jobType || !deadline || !companyName || !category || !experience) {
    throw ApiError.badRequest(
      'Missing required fields: title, description, requirements, location, jobType, deadline, companyName, category, experience'
    );
  }

  // Validate skills
  if (!skills || !Array.isArray(skills) || skills.length === 0) {
    throw ApiError.badRequest('Skills are required and must be an array with at least one skill');
  }

  // Validate job type
  if (!JOB_TYPES.includes(jobType)) {
    throw ApiError.badRequest(`Invalid job type. Must be one of: ${JOB_TYPES.join(', ')}`);
  }

  // Validate work mode if provided
  if (workMode && !WORK_MODES.includes(workMode)) {
    throw ApiError.badRequest(`Invalid work mode. Must be one of: ${WORK_MODES.join(', ')}`);
  }

  // Validate category
  if (!JOB_CATEGORIES.includes(category)) {
    throw ApiError.badRequest(`Invalid category. Must be one of: ${JOB_CATEGORIES.join(', ')}`);
  }

  // Validate experience
  if (!EXPERIENCE_LEVELS.includes(experience)) {
    throw ApiError.badRequest(`Invalid experience level. Must be one of: ${EXPERIENCE_LEVELS.join(', ')}`);
  }

  // Validate deadline must be future date
  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
    throw ApiError.badRequest('Deadline must be a valid future date');
  }

  // Validate salary range if provided
  if (salaryMin && salaryMax && salaryMin > salaryMax) {
    throw ApiError.badRequest('Minimum salary cannot be greater than maximum salary');
  }

  // Build job data with correct schema field names
  const jobData = {
    title: title.trim(),
    description: description.trim(),
    location: location.trim(),
    postedBy: req.user._id,
    requirements: requirements.map(r => r.trim()).filter(r => r),
    skills: skills.map(s => s.trim()).filter(s => s),
    type: jobType,  // Schema field is 'type', not 'jobType'
    expiryDate: deadlineDate,  // Schema field is 'expiryDate', not 'deadline'
    category,
    experience,
    status: status === JOB_STATUS.ACTIVE ? JOB_STATUS.ACTIVE : JOB_STATUS.DRAFT
  };

  if (workMode) jobData.workMode = workMode;
  if (isUnpaid) jobData.isUnpaid = true;

  // Add optional fields (skip salary if job marked unpaid)
  if (!isUnpaid && (salaryMin || salaryMax)) {
    jobData.salary = {};
    if (salaryMin) jobData.salary.min = salaryMin;
    if (salaryMax) jobData.salary.max = salaryMax;
    if (currency) jobData.salary.currency = currency;
  }

  if (companyDescription) {
    jobData.company = jobData.company || {};
    jobData.company.description = companyDescription;
  }

  if (benefits && Array.isArray(benefits)) {
    jobData.benefits = benefits.map(b => b.trim()).filter(b => b);
  }

  if (companyName) {
    jobData.company = jobData.company || {};
    jobData.company.name = companyName.trim();
  }

  try {
    const job = await Job.create(jobData);

    res.status(201).json(
      ApiResponse.created(job, 'Job created successfully')
    );
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      throw ApiError.badRequest(`Validation failed: ${messages.join(', ')}`);
    }
    throw error;
  }
});

/**
 * @swagger
 * /api/jobs/{id}/publish:
 *   patch:
 *     summary: Publish a draft job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string}
 *     responses:
 *       200:
 *         description: Job published successfully
 */
const publishJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Job.findById(id);
  if (!job) {
    throw ApiError.notFound('Job not found');
  }

  // Only recruiter who owns the job can publish it
  if (job.postedBy.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only publish your own jobs');
  }

  // Only draft jobs can be published
  if (job.status !== JOB_STATUS.DRAFT) {
    throw ApiError.badRequest('Only draft jobs can be published');
  }

  // Check all required fields are filled (use correct schema field names)
  const requiredFields = ['title', 'description', 'requirements', 'location', 'type', 'workMode', 'expiryDate'];
  const missingFields = requiredFields.filter(field => !job[field]);
  if (missingFields.length > 0) {
    throw ApiError.badRequest(`Cannot publish job. Missing required fields: ${missingFields.join(', ')}`);
  }

  job.status = JOB_STATUS.ACTIVE;
  await job.save();

  res.json(
    ApiResponse.success(job, 'Job published successfully')
  );
});

/**
 * @swagger
 * /api/jobs/{id}:
 *   put:
 *     summary: Update a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string}
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Job updated successfully
 */
const updateJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let updateData = req.body;

  const fieldLabels = {
    title: 'title',
    description: 'description',
    requirements: 'requirements',
    skills: 'skills',
    location: 'location',
    jobType: 'job type',
    type: 'job type',
    salaryMin: 'minimum salary',
    salaryMax: 'maximum salary',
    salary: 'salary',
    currency: 'salary currency',
    deadline: 'application deadline',
    expiryDate: 'application deadline',
    companyDescription: 'company description',
    company: 'company details',
    benefits: 'benefits',
    companyName: 'company name',
    category: 'category',
    experience: 'experience level',
    status: 'status',
    workMode: 'work mode',
    isUnpaid: 'compensation type'
  };

  const job = await Job.findById(id);
  if (!job) {
    throw ApiError.notFound('Job not found');
  }

  // Recruiters can update only their own jobs; admins can update any job.
  if (req.user.role === 'recruiter' && job.postedBy.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only update your own jobs');
  }

  // Cannot update if status is closed or expired
  if (job.status === JOB_STATUS.CLOSED || job.status === JOB_STATUS.EXPIRED) {
    throw ApiError.badRequest('Cannot update closed or expired jobs');
  }

  // Map request field names to schema field names
  const mappedData = {};

  // Handle deadline → expiryDate mapping
  if (updateData.deadline) {
    const deadlineDate = new Date(updateData.deadline);
    if (deadlineDate <= new Date()) {
      throw ApiError.badRequest('Deadline must be a future date');
    }
    mappedData.expiryDate = deadlineDate;
  } else if (updateData.expiryDate) {
    const expiryDate = new Date(updateData.expiryDate);
    if (expiryDate <= new Date()) {
      throw ApiError.badRequest('Expiry date must be a future date');
    }
    mappedData.expiryDate = expiryDate;
  }

  // Handle jobType → type mapping
  if (updateData.jobType) {
    if (!JOB_TYPES.includes(updateData.jobType)) {
      throw ApiError.badRequest(`Invalid job type. Must be one of: ${JOB_TYPES.join(', ')}`);
    }
    mappedData.type = updateData.jobType;
  } else if (updateData.type) {
    if (!JOB_TYPES.includes(updateData.type)) {
      throw ApiError.badRequest(`Invalid job type. Must be one of: ${JOB_TYPES.join(', ')}`);
    }
    mappedData.type = updateData.type;
  }

  // Copy other fields directly
  const directFields = ['title', 'description', 'location', 'requirements', 'skills', 'category', 'experience', 'status', 'benefits'];
  for (const field of directFields) {
    if (updateData[field] !== undefined) {
      mappedData[field] = updateData[field];
    }
  }

  // Handle salary
  if (updateData.salaryMin !== undefined || updateData.salaryMax !== undefined) {
    const salary = { ...(job.salary || {}) };
    if (updateData.salaryMin !== undefined) salary.min = updateData.salaryMin;
    if (updateData.salaryMax !== undefined) salary.max = updateData.salaryMax;
    if (updateData.currency !== undefined) salary.currency = updateData.currency;
    
    // Validate salary range
    if (salary.min && salary.max && salary.min > salary.max) {
      throw ApiError.badRequest('Minimum salary cannot be greater than maximum salary');
    }
    mappedData.salary = salary;
  } else if (updateData.salary !== undefined) {
    mappedData.salary = updateData.salary;
  } else if (updateData.currency !== undefined) {
    mappedData.salary = { ...(job.salary || {}), currency: updateData.currency };
  }

  // Handle workMode
  if (updateData.workMode !== undefined) {
    if (updateData.workMode && !WORK_MODES.includes(updateData.workMode)) {
      throw ApiError.badRequest(`Invalid work mode. Must be one of: ${WORK_MODES.join(', ')}`);
    }
    mappedData.workMode = updateData.workMode;
  }

  // Handle unpaid flag
  if (updateData.isUnpaid !== undefined) {
    mappedData.isUnpaid = !!updateData.isUnpaid;
    if (mappedData.isUnpaid) {
      mappedData.salary = undefined;
    }
  }

  // Handle company info
  if (updateData.companyName || updateData.companyDescription) {
    mappedData.company = job.company || {};
    if (updateData.companyName) mappedData.company.name = updateData.companyName;
    if (updateData.companyDescription) mappedData.company.description = updateData.companyDescription;
  }

  // Convert skills to array if provided
  if (mappedData.skills) {
    mappedData.skills = Array.isArray(mappedData.skills) ? mappedData.skills : [mappedData.skills];
  }

  const updatedJob = await Job.findByIdAndUpdate(
    id,
    mappedData,
    { new: true, runValidators: true }
  );

  // Notify all applicants about job updates without blocking recruiter workflow.
  const updatedFields = Array.from(new Set(
    Object.keys(mappedData)
      .filter((key) => key !== 'updatedAt' && key !== '__v')
      .map((key) => fieldLabels[key] || key)
  ));

  setImmediate(async () => {
    try {
      const applications = await Application.find({
        job: id,
        status: { $ne: 'withdrawn' }
      }).populate('applicant', 'firstName email');

      if (!applications.length) return;

      const notificationTasks = applications.map(async (application) => {
        try {
          await notifyJobUpdated(application, updatedJob, updatedFields);
        } catch (error) {
          console.error(`Failed to send in-app job update notification to applicant ${application.applicant?._id}:`, error.message);
        }

        try {
          if (application.applicant?.email) {
            await emailService.sendJobUpdatedEmail(application.applicant, updatedJob, updatedFields);
          }
        } catch (error) {
          console.error(`Failed to send job update email to applicant ${application.applicant?._id}:`, error.message);
        }
      });

      await Promise.allSettled(notificationTasks);
    } catch (error) {
      console.error('Failed to process job update notifications:', error.message);
    }
  });

  res.json(
    ApiResponse.success(updatedJob, 'Job updated successfully')
  );
});

/**
 * @swagger
 * /api/jobs/{id}:
 *   delete:
 *     summary: Delete a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string}
 *     responses:
 *       200:
 *         description: Job deleted successfully
 */
const deleteJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Job.findById(id);
  if (!job) {
    throw ApiError.notFound('Job not found');
  }

  // Recruiter can only delete their own draft/closed jobs
  if (req.user.role === 'recruiter') {
    if (job.postedBy.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('You can only delete your own jobs');
    }
    if (job.status !== JOB_STATUS.DRAFT && job.status !== JOB_STATUS.CLOSED) {
      throw ApiError.badRequest('You can only delete draft or closed jobs');
    }
  }

  // Check if job has applications
  const applicationCount = await Application.countDocuments({ job: id });

  if (applicationCount > 0) {
    // Don't hard delete - set status to closed instead
    job.status = JOB_STATUS.CLOSED;
    await job.save();
    return res.json(
      ApiResponse.success(job, 'Job closed successfully as it has existing applications')
    );
  }

  // Hard delete if no applications
  await Job.findByIdAndDelete(id);

  res.json(
    ApiResponse.success(null, 'Job deleted successfully')
  );
});

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: Get all active jobs (or recruiter's own jobs)
 *     tags: [Jobs]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: {type: string}
 *       - in: query
 *         name: location
 *         schema: {type: string}
 *       - in: query
 *         name: jobType
 *         schema: {type: string}
 *       - in: query
 *         name: salaryMin
 *         schema: {type: integer}
 *     responses:
 *       200:
 *         description: Paginated list of jobs
 */
const getJobs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    location,
    jobType,
    workMode,
    skills,
    salaryMin,
    salaryMax,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  const query = {};

  // Public users only see active jobs
  if (!req.user || req.user.role === 'jobseeker') {
    query.status = JOB_STATUS.ACTIVE;
  }

  // Recruiters see their own jobs of all statuses
  if (req.user && req.user.role === 'recruiter') {
    query.postedBy = req.user._id;
  }

  // Admin sees all jobs (no filter)
  if (req.user && req.user.role === 'admin') {
    // No status filter for admin
  }

  // Search by title/description
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Filter by location
  if (location) {
    query.location = { $regex: location, $options: 'i' };
  }

  // Filter by job type
  if (jobType) {
    query.type = jobType;
  }

  // Filter by work mode
  if (workMode) {
    query.workMode = workMode;
  }

  // Filter by unpaid flag
  if (req.query.unpaid !== undefined) {
    const unpaidFlag = req.query.unpaid === 'true' || req.query.unpaid === '1' || req.query.unpaid === true;
    query.isUnpaid = unpaidFlag;
  }

  // Filter by skills (array intersection)
  if (skills) {
    const skillArray = Array.isArray(skills) ? skills : [skills];
    query.skills = { $in: skillArray };
  }

  // Filter by salary range
  if (salaryMin || salaryMax) {
    query.$and = [];
    if (salaryMin) query.$and.push({ 'salary.min': { $gte: parseInt(salaryMin) } });
    if (salaryMax) query.$and.push({ 'salary.max': { $lte: parseInt(salaryMax) } });
    if (query.$and.length === 0) delete query.$and;
  }

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 50); // Max 50 per page
  const skip = (pageNum - 1) * limitNum;

  // Sort
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const jobs = await Job.find(query)
    .populate('postedBy', 'firstName lastName email')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  const jobsWithCount = await Promise.all(
    jobs.map(async (job) => {
      const applicantCount = await Application.countDocuments({ job: job._id });

      return {
        ...job.toObject(),
        applicantCount,
        applicantsCount: applicantCount,
        applicationCount: applicantCount
      };
    })
  );

  const total = await Job.countDocuments(query);

  res.json(
    ApiResponse.paginated(jobsWithCount, {
      page: pageNum,
      limit: limitNum,
      total
    })
  );
});

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string}
 *     responses:
 *       200:
 *         description: Job details
 */
const getJobById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Job.findById(id)
    .populate('postedBy', 'firstName lastName email company');

  if (!job) {
    throw ApiError.notFound('Job not found');
  }

  // Increment viewsCount using $inc
  await Job.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } });

  // If requester is applicant and already applied, include their application stage
  let userApplication = null;
  if (req.user && req.user.role === 'jobseeker') {
    userApplication = await Application.findOne({
      job: id,
      applicant: req.user._id
    }).select('status stage');
  }

  const responseData = {
    ...job.toObject(),
    userApplication: userApplication
      ? (userApplication.status || userApplication.stage || null)
      : null
  };

  res.json(
    ApiResponse.success(responseData)
  );
});

/**
 * @swagger
 * /api/jobs/my/listings:
 *   get:
 *     summary: Get recruiter's own jobs
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recruiter's jobs
 */
const getMyJobs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = { postedBy: req.user._id };
  if (status) {
    query.status = status;
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const jobs = await Job.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Get applicant count for each job
  const jobsWithCount = await Promise.all(
    jobs.map(async (job) => {
      const applicantCount = await Application.countDocuments({ job: job._id });
      return {
        ...job.toObject(),
        applicantCount
      };
    })
  );

  const total = await Job.countDocuments(query);

  res.json(
    ApiResponse.paginated(jobsWithCount, {
      page: pageNum,
      limit: limitNum,
      total
    })
  );
});

/**
 * @swagger
 * /api/jobs/{id}/close:
 *   patch:
 *     summary: Close a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string}
 *     responses:
 *       200:
 *         description: Job closed successfully
 */
const closeJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Job.findById(id);
  if (!job) {
    throw ApiError.notFound('Job not found');
  }

  // Recruiter can only close their own jobs
  if (req.user.role === 'recruiter' && job.postedBy.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only close your own jobs');
  }

  job.status = JOB_STATUS.CLOSED;
  await job.save();

  // Notify all applicants whose application is still in progress
  const activeApplications = await Application.find({
    job: id,
    stage: { $nin: ['rejected', 'withdrawn', 'offer'] }
  }).populate('applicant', 'email firstName lastName');

  // Trigger background notifications (Parallelized & Non-blocking)
  setImmediate(async () => {
    const notifications = activeApplications.map(async (app) => {
      try {
        // 1. Centralized In-app notification & Socket emit
        await notifyJobClosed(app, job);

        // 2. Send Email
        return emailService.sendJobClosedEmail(app.applicant, job);
      } catch (err) {
        console.error(`Failed to notify applicant ${app.applicant._id}:`, err);
      }
    });

    await Promise.allSettled(notifications);
  });

  res.json(
    ApiResponse.success(job, 'Job closed successfully and applicants notified')
  );
});

module.exports = {
  createJob,
  publishJob,
  updateJob,
  deleteJob,
  getJobs,
  getJobById,
  getMyJobs,
  closeJob
};
