const Job = require('../models/Job');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { JOB_STATUS, JOB_TYPES, WORK_MODES, JOB_CATEGORIES, EXPERIENCE_LEVELS } = require('../utils/constants');
const emailService = require('../services/emailService');
const { getIO } = require('../services/socket.service');

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
  // Debug: Log the entire request body
  console.log('Request body:', req.body);
  console.log('Request body keys:', Object.keys(req.body));

  // Debug: Log specific field values
  console.log('jobType:', req.body.jobType);
  console.log('deadline:', req.body.deadline);
  console.log('companyName:', req.body.companyName);
  console.log('Expected jobType:', JOB_TYPES);
  console.log('Expected workMode:', WORK_MODES);

  const {
    title,
    description,
    requirements,
    skills,
    location,
    jobType,
    workMode,
    salaryMin,
    salaryMax,
    deadline,
    companyDescription,
    benefits,
    companyName,
    category,
    experience
  } = req.body;

  // Debug: Check deadline format
  const deadlineDate = new Date(deadline);
  console.log('Deadline date object:', deadlineDate);
  console.log('Deadline is valid date:', !isNaN(deadlineDate.getTime()));
  console.log('Deadline is future date:', deadlineDate > new Date());

  // Debug: Log individual field values
  console.log('Field values:');
  console.log('title:', title);
  console.log('description:', description);
  console.log('requirements:', requirements);
  console.log('location:', location);
  console.log('jobType:', jobType);
  console.log('companyName:', companyName);
  console.log('category:', category);
  console.log('experience:', experience);

  // Validate required fields
  if (!title || !description || !requirements || !location || !jobType || !workMode || !deadline || !companyName || !category || !experience) {
    throw ApiError.badRequest('Missing required fields');
  }

  // Validate skills
  if (!skills || !Array.isArray(skills) || skills.length === 0) {
    throw ApiError.badRequest('Skills are required');
  }

  // Validate job type
  if (!JOB_TYPES.includes(jobType)) {
    throw ApiError.badRequest(`Invalid job type. Must be one of: ${JOB_TYPES.join(', ')}`);
  }

  // Validate work mode
  if (!WORK_MODES.includes(workMode)) {
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
  if (deadlineDate <= new Date()) {
    throw ApiError.badRequest('Deadline must be a future date');
  }

  // Debug: Check if user is authenticated
  console.log('Authenticated user:', req.user);
  console.log('User ID:', req.user._id);
  console.log('User ID type:', typeof req.user._id);
  console.log('User ID string:', req.user._id.toString());

  // Validate salary range
  if (salaryMin && salaryMax && salaryMin > salaryMax) {
    throw ApiError.badRequest('Minimum salary cannot be greater than maximum salary');
  }

  // Debug: Log right before Job.create
  console.log('About to create job with data:');
  console.log('title:', title);
  console.log('description:', description);
  console.log('location:', location);
  console.log('postedBy:', req.user._id.toString());

  let job;
  try {
    // Start with minimal working data
    const jobData = {
      title,
      description,
      location,
      postedBy: req.user._id.toString()
    };

    // Add fields that are not causing issues
    if (requirements) jobData.requirements = requirements;
    if (skills && Array.isArray(skills)) jobData.skills = skills;
    if (jobType) jobData.type = jobType;
    if (workMode) jobData.workMode = workMode;
    if (salaryMin || salaryMax) {
      jobData.salary = {};
      if (salaryMin) jobData.salary.min = salaryMin;
      if (salaryMax) jobData.salary.max = salaryMax;
    }
    if (deadlineDate) jobData.expiryDate = deadlineDate;
    if (companyDescription) jobData.companyDescription = companyDescription;
    if (benefits && Array.isArray(benefits)) jobData.benefits = benefits;
    if (companyName) {
      jobData.company = { name: companyName };
    }
    if (category) jobData.category = category;
    if (experience) jobData.experience = experience;

    console.log('Final job data:', JSON.stringify(jobData, null, 2));

    job = await Job.create(jobData, {
      status: JOB_STATUS.DRAFT
    });

    console.log('Job created successfully:', job._id);
    console.log('Job postedBy:', job.postedBy);
  } catch (error) {
    console.error('Error creating job:', error);
    throw error;
  }

  res.status(201).json(
    ApiResponse.created(job, 'Job created successfully')
  );
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

  // Check all required fields are filled
  const requiredFields = ['title', 'description', 'requirements', 'location', 'jobType', 'workMode', 'deadline'];
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
  const updateData = req.body;

  const job = await Job.findById(id);
  if (!job) {
    throw ApiError.notFound('Job not found');
  }

  // Only owner recruiter can update
  if (job.postedBy.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only update your own jobs');
  }

  // Cannot update if status is closed or expired
  if (job.status === JOB_STATUS.CLOSED || job.status === JOB_STATUS.EXPIRED) {
    throw ApiError.badRequest('Cannot update closed or expired jobs');
  }

  // Cannot set deadline to past date
  if (updateData.deadline) {
    const deadlineDate = new Date(updateData.deadline);
    if (deadlineDate <= new Date()) {
      throw ApiError.badRequest('Deadline must be a future date');
    }
    updateData.deadline = deadlineDate;
  }

  // Validate job type if provided
  if (updateData.jobType && !JOB_TYPES.includes(updateData.jobType)) {
    throw ApiError.badRequest(`Invalid job type. Must be one of: ${JOB_TYPES.join(', ')}`);
  }

  // Validate work mode if provided
  if (updateData.workMode && !WORK_MODES.includes(updateData.workMode)) {
    throw ApiError.badRequest(`Invalid work mode. Must be one of: ${WORK_MODES.join(', ')}`);
  }

  // Validate salary range if both provided
  if (updateData.salaryMin && updateData.salaryMax && updateData.salaryMin > updateData.salaryMax) {
    throw ApiError.badRequest('Minimum salary cannot be greater than maximum salary');
  }

  // Convert skills to array if provided
  if (updateData.skills) {
    updateData.skills = Array.isArray(updateData.skills) ? updateData.skills : [updateData.skills];
  }

  const updatedJob = await Job.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

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
    query.jobType = jobType;
  }

  // Filter by work mode
  if (workMode) {
    query.workMode = workMode;
  }

  // Filter by skills (array intersection)
  if (skills) {
    const skillArray = Array.isArray(skills) ? skills : [skills];
    query.skills = { $in: skillArray };
  }

  // Filter by salary range
  if (salaryMin || salaryMax) {
    query.$and = [];
    if (salaryMin) query.$and.push({ salaryMin: { $gte: parseInt(salaryMin) } });
    if (salaryMax) query.$and.push({ salaryMax: { $lte: parseInt(salaryMax) } });
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

  const total = await Job.countDocuments(query);

  res.json(
    ApiResponse.paginated(jobs, {
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
    }).select('stage');
  }

  const responseData = {
    ...job.toObject(),
    userApplication: userApplication ? userApplication.stage : null
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

  // Trigger background notifications
  setImmediate(async () => {
    const io = getIO();
    for (const app of activeApplications) {
      try {
        // 1. Create In-app notification
        await Notification.create({
          recipient: app.applicant._id,
          sender: req.user._id,
          type: 'system',
          title: 'Job Closed',
          message: `The job "${job.title}" has been closed.`,
          data: { jobId: job._id, applicationId: app._id }
        });

        // 2. Emit socket event
        io.to(app.applicant._id.toString()).emit('notification', {
          type: 'JOB_CLOSED',
          message: `The job "${job.title}" has been closed.`
        });

        // 3. Send Email
        await emailService.sendJobClosedEmail(app.applicant, job);
      } catch (err) {
        console.error(`Failed to notify applicant ${app.applicant._id}:`, err);
      }
    }
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
