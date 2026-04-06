const express = require('express');
const { body, param } = require('express-validator');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const applicationController = require('../controllers/application.controller');
const { verifyJWT } = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');
const { uploadLimiter, apiLimiter } = require('../middleware/rateLimiter');
const { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } = require('../utils/constants');

// Use Cloudinary if credentials are provided, otherwise use disk storage for local dev
let uploadStorage;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  const { storage } = require('../config/cloudinary');
  uploadStorage = storage;
} else {
  // Fallback to disk storage for local development
  uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `resume-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });
}

const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only PDF, DOC, DOCX files are allowed'), false);
    }
    cb(null, true);
  }
});

const applyToJobValidation = [
  body('coverLetter')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Cover letter cannot exceed 2000 characters')
];

const updateStageValidation = [
  body('stage')
    .isIn(['applied', 'screening', 'interview', 'technical', 'offer', 'rejected', 'withdrawn'])
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

const noteValidation = [
  body('note')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Note must be between 1 and 500 characters')
];

router.post(
  '/:jobId',
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
  '/my/recent',
  verifyJWT,
  roleGuard('recruiter'),
  applicationController.getRecruiterRecentApplications
);

router.get(
  '/my/pipeline',
  verifyJWT,
  roleGuard('recruiter'),
  applicationController.getRecruiterPipeline
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
  '/:id/note',
  verifyJWT,
  roleGuard('recruiter'),
  objectIdValidation,
  noteValidation,
  validate,
  applicationController.updateApplicationNote
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
  roleGuard('recruiter'),
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
