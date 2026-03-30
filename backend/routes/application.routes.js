const express = require('express');
const { body, param } = require('express-validator');
const multer = require('multer');
const router = express.Router();

const applicationController = require('../controllers/application.controller');
const { verifyJWT } = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');
const { uploadLimiter, apiLimiter } = require('../middleware/rateLimiter');
const { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } = require('../utils/constants');

// Configure multer for resume uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only PDF files are allowed'), false);
    }
    cb(null, true);
  }
});

// Validation rules
const applyToJobValidation = [
  body('coverLetter')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Cover letter cannot exceed 2000 characters')
];

const updateStageValidation = [
  body('stage')
    .isIn(['applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'])
    .withMessage('Invalid stage'),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Note cannot exceed 500 characters')
];

const objectIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid application ID')
];

const jobIdValidation = [
  param('jobId')
    .isMongoId()
    .withMessage('Invalid job ID')
];

// Routes
router.post(
  '/',
  uploadLimiter,
  verifyJWT,
  roleGuard('jobseeker'),
  upload.single('resume'),
  applyToJobValidation,
  validate,
  applicationController.applyToJob
);

router.get(
  '/my',
  verifyJWT,
  roleGuard('jobseeker'),
  applicationController.getMyApplications
);

router.get(
  '/:id',
  verifyJWT,
  objectIdValidation,
  validate,
  applicationController.getApplicationById
);

router.patch(
  '/:id/stage',
  verifyJWT,
  roleGuard('recruiter'),
  objectIdValidation,
  updateStageValidation,
  validate,
  applicationController.updateApplicationStage
);

router.patch(
  '/:id/shortlist',
  verifyJWT,
  roleGuard('recruiter'),
  objectIdValidation,
  validate,
  applicationController.toggleShortlist
);

router.patch(
  '/:id/withdraw',
  verifyJWT,
  roleGuard('jobseeker'),
  objectIdValidation,
  validate,
  applicationController.withdrawApplication
);

router.get(
  '/jobs/:jobId/applications',
  verifyJWT,
  roleGuard('recruiter', 'admin'),
  jobIdValidation,
  validate,
  applicationController.getJobApplications
);

router.get(
  '/',
  verifyJWT,
  roleGuard('admin'),
  applicationController.getAllApplications
);

module.exports = router;
