const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyJWT } = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { storage } = require('../config/cloudinary');
const multer = require('multer');

const upload = multer({ storage });

// Profile routes
router.get('/profile', verifyJWT, (req, res) => res.json({ status: 'success', data: req.user }));
router.put('/profile', verifyJWT, userController.updateProfile);

router.post(
    '/upload-resume',
    verifyJWT,
    roleGuard('jobseeker'),
    uploadLimiter,
    upload.single('resume'),
    userController.uploadResume
);

router.post(
    '/upload-avatar',
    verifyJWT,
    uploadLimiter,
    upload.single('avatar'),
    userController.uploadAvatar
);

router.put('/change-password', verifyJWT, userController.updatePassword);

// Admin routes
router.get('/', verifyJWT, roleGuard('admin'), userController.getAllUsers);
router.get('/:id', verifyJWT, roleGuard('admin'), userController.getUserById);
router.patch('/:id/status', verifyJWT, roleGuard('admin'), userController.toggleUserStatus);
router.patch('/:id/role', verifyJWT, roleGuard('admin'), userController.changeUserRole);
router.delete('/:id', verifyJWT, roleGuard('admin'), userController.deleteUser);

module.exports = router;
