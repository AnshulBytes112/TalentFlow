const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyJWT } = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');
const { uploadLimiter } = require('../middleware/rateLimiter');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { MAX_FILE_SIZE, ALLOWED_FILE_TYPES, ALLOWED_IMAGE_TYPES } = require('../utils/constants');

// Always save files locally first, then optionally mirror to Cloudinary in controller.
const uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const uploadResume = multer({
    storage: uploadStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
            return cb(new Error('Invalid file type. Only PDF files are allowed'), false);
        }
        cb(null, true);
    }
});

const uploadAvatar = multer({
    storage: uploadStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            return cb(new Error('Invalid image type. Only JPG, PNG, WEBP are allowed'), false);
        }
        cb(null, true);
    }
});

router.get('/profile', verifyJWT, (req, res) => res.json({ status: 'success', data: req.user }));
router.put('/profile', verifyJWT, userController.updateProfile);

router.post(
    '/upload-resume',
    verifyJWT,
    roleGuard('jobseeker'),
    uploadLimiter,
    uploadResume.single('resume'),
    userController.uploadResume
);

router.post(
    '/upload-avatar',
    verifyJWT,
    uploadLimiter,
    uploadAvatar.single('avatar'),
    userController.uploadAvatar
);

router.get('/resume/access', verifyJWT, roleGuard('jobseeker'), userController.getResumeAccess);

router.put('/change-password', verifyJWT, userController.updatePassword);

router.get('/', verifyJWT, roleGuard('admin'), userController.getAllUsers);
router.get('/:id', verifyJWT, roleGuard('admin'), userController.getUserById);
router.patch('/:id/status', verifyJWT, roleGuard('admin'), userController.toggleUserStatus);
router.patch('/:id/role', verifyJWT, roleGuard('admin'), userController.changeUserRole);
router.delete('/:id', verifyJWT, roleGuard('admin'), userController.deleteUser);

module.exports = router;
