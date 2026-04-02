const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const jobController = require('../controllers/job.controller');
const { verifyJWT, optionalAuth } = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');
const { authLimiter, apiLimiter } = require('../middleware/rateLimiter');

// Validation rules
const createJobValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage('Description must be between 50 and 5000 characters'),
  body('requirements')
    .isArray({ min: 1 })
    .withMessage('At least one requirement is required')
    .custom((requirements) => {
      return requirements.every(req => typeof req === 'string' && req.trim().length > 0);
    })
    .withMessage('All requirements must be non-empty strings'),
  body('location')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters'),
  body('jobType')
    .isIn(['full-time', 'part-time', 'contract', 'internship'])
    .withMessage('Invalid job type'),
  body('deadline')
    .isISO8601()
    .withMessage('Deadline must be a valid date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Deadline must be a future date');
      }
      return true;
    }),
  body('salaryMin')
    .optional()
    .isNumeric()
    .withMessage('Minimum salary must be a number'),
  body('salaryMax')
    .optional()
    .isNumeric()
    .withMessage('Maximum salary must be a number')
    .custom((value, { req }) => {
      if (req.body.salaryMin && value && parseInt(req.body.salaryMin) > parseInt(value)) {
        throw new Error('Minimum salary cannot be greater than maximum salary');
      }
      return true;
    }),
  body('skills')
    .isArray({ min: 1 })
    .withMessage('At least one skill is required')
    .custom((skills) => {
      return skills.every(skill => typeof skill === 'string' && skill.trim().length > 0);
    })
    .withMessage('All skills must be non-empty strings'),
  body('companyDescription')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Company description cannot exceed 2000 characters'),
  body('benefits')
    .optional()
    .isArray()
    .withMessage('Benefits must be an array'),
  body('companyName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('category')
    .isIn(['engineering', 'design', 'marketing', 'sales', 'customer-support', 'product', 'data-science', 'hr', 'finance', 'operations', 'other'])
    .withMessage('Invalid category'),
  body('experience')
    .isIn(['entry-level', 'mid-level', 'senior-level', 'executive'])
    .withMessage('Invalid experience level')
];

const updateJobValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage('Description must be between 50 and 5000 characters'),
  body('requirements')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Requirements must be a non-empty array')
    .custom((requirements) => {
      return requirements.every(req => typeof req === 'string' && req.trim().length > 0);
    })
    .withMessage('All requirements must be non-empty strings'),
  body('location')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters'),
  body('jobType')
    .optional()
    .isIn(['full-time', 'part-time', 'contract', 'internship'])
    .withMessage('Invalid job type'),
  body('deadline')
    .optional()
    .isISO8601()
    .withMessage('Deadline must be a valid date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Deadline must be a future date');
      }
      return true;
    }),
  body('salaryMin')
    .optional()
    .isNumeric()
    .withMessage('Minimum salary must be a number'),
  body('salaryMax')
    .optional()
    .isNumeric()
    .withMessage('Maximum salary must be a number')
    .custom((value, { req }) => {
      if (req.body.salaryMin && value && parseInt(req.body.salaryMin) > parseInt(value)) {
        throw new Error('Minimum salary cannot be greater than maximum salary');
      }
      return true;
    }),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array')
    .custom((skills) => {
      return skills.every(skill => typeof skill === 'string' && skill.trim().length > 0);
    })
    .withMessage('All skills must be non-empty strings'),
  body('companyDescription')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Company description cannot exceed 2000 characters'),
  body('benefits')
    .optional()
    .isArray()
    .withMessage('Benefits must be an array')
];

// Routes
router.get('/', apiLimiter, optionalAuth, jobController.getJobs);
router.get('/my/listings', verifyJWT, roleGuard('recruiter'), jobController.getMyJobs);
router.get('/my', verifyJWT, roleGuard('recruiter'), jobController.getMyJobs);
router.get('/:id', apiLimiter, optionalAuth, jobController.getJobById);

router.post(
  '/',
  authLimiter,
  verifyJWT,
  roleGuard('recruiter'),
  createJobValidation,
  validate,
  jobController.createJob
);

router.put(
  '/:id',
  verifyJWT,
  roleGuard('recruiter', 'admin'),
  updateJobValidation,
  validate,
  jobController.updateJob
);

router.delete(
  '/:id',
  verifyJWT,
  roleGuard('recruiter', 'admin'),
  jobController.deleteJob
);

router.patch(
  '/:id/publish',
  verifyJWT,
  roleGuard('recruiter'),
  jobController.publishJob
);

router.patch(
  '/:id/close',
  verifyJWT,
  roleGuard('recruiter', 'admin'),
  jobController.closeJob
);

router.get(
  '/my/listings',
  verifyJWT,
  roleGuard('recruiter'),
  jobController.getMyJobs
);

module.exports = router;
