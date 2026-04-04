const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { cloudinary, uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const emailService = require('../services/emailService');
const { ROLES } = require('../utils/constants');
const { createNotification } = require('../services/notificationService');
const { emitToUser, disconnectUser } = require('../services/socketService');
const path = require('path');
const fs = require('fs');

const isValidCloudinaryValue = (value) => {
    if (!value) return false;
    const normalized = String(value).trim().toLowerCase();
    return !normalized.startsWith('your_') && !normalized.includes('placeholder');
};

const cloudinaryConfigured =
    isValidCloudinaryValue(process.env.CLOUDINARY_CLOUD_NAME) &&
    isValidCloudinaryValue(process.env.CLOUDINARY_API_KEY) &&
    isValidCloudinaryValue(process.env.CLOUDINARY_API_SECRET);

const buildLocalUploadUrl = (req, filePath) => {
    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    return `${backendUrl}/uploads/${path.basename(filePath)}`;
};

const safeRemoveLocalFile = (filePath) => {
    if (!filePath || /^https?:\/\//i.test(filePath)) return;
    fs.unlink(filePath, (error) => {
        if (error && error.code !== 'ENOENT') {
            console.warn('Failed to remove temporary upload file:', error.message);
        }
    });
};

const extractFileExtension = (url = '', fallback = 'pdf') => {
    const clean = String(url).split('?')[0];
    const filename = clean.split('/').pop() || '';
    const parts = filename.split('.');
    if (parts.length < 2) return fallback;
    return parts.pop() || fallback;
};

const extractFileName = (url = '', fallback = 'resume') => {
    const clean = String(url).split('?')[0];
    const filename = clean.split('/').pop() || '';
    try {
        return decodeURIComponent(filename) || fallback;
    } catch {
        return filename || fallback;
    }
};

const parseCloudinaryRawAsset = (url = '') => {
    try {
        const parsedUrl = new URL(String(url));
        const uploadMarker = '/upload/';
        const markerIndex = parsedUrl.pathname.indexOf(uploadMarker);

        if (markerIndex === -1) {
            return { publicId: '', format: '' };
        }

        let assetPath = parsedUrl.pathname.slice(markerIndex + uploadMarker.length);
        assetPath = assetPath.replace(/^s--[^/]+--\//, '');
        assetPath = assetPath.replace(/^v\d+\//, '');

        if (!assetPath) {
            return { publicId: '', format: '' };
        }

        const decodedPath = decodeURIComponent(assetPath);
        const lastDot = decodedPath.lastIndexOf('.');

        if (lastDot === -1) {
            return { publicId: decodedPath, format: '' };
        }

        return {
            publicId: decodedPath.slice(0, lastDot),
            format: decodedPath.slice(lastDot + 1),
        };
    } catch {
        return { publicId: '', format: '' };
    }
};

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
const updateProfile = asyncHandler(async (req, res) => {
    const { role, profile } = req.user;
    const updateData = req.body;

    // Prevent email or role update via this endpoint
    delete updateData.email;
    delete updateData.role;

    const profileUpdate = {};

    if (role === ROLES.JOBSEEKER) {
        // Jobseeker: update bio, phone, location, skills, experience
        const allowedFields = ['bio', 'phone', 'location', 'skills', 'experience', 'experienceYears', 'education', 'socialLinks', 'resumeUrl'];
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                profileUpdate[`profile.${field}`] = updateData[field];
            }
        });
    } else if (role === ROLES.RECRUITER) {
        // Recruiter: update company name, website, description
        const allowedFields = ['companyName', 'website', 'companyDescription', 'phone', 'location', 'bio'];
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                profileUpdate[`profile.${field}`] = updateData[field];
            }
        });
    }

    // Also allow updating firstName and lastName
    if (updateData.firstName) profileUpdate.firstName = updateData.firstName;
    if (updateData.lastName) profileUpdate.lastName = updateData.lastName;

    if (Object.keys(profileUpdate).length === 0) {
        throw ApiError.badRequest('No valid fields provided for update');
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: profileUpdate },
        { new: true, runValidators: true }
    );

    res.json(ApiResponse.success(user, 'Profile updated successfully'));
});

/**
 * @swagger
 * /api/users/upload-resume:
 *   post:
 *     summary: Upload resume
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Resume uploaded successfully
 */
const uploadResume = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw ApiError.badRequest('Please upload a resume file');
    }

    // Delete previous resume from Cloudinary if exists
    if (req.user.profile.resumePublicId && cloudinaryConfigured) {
        try {
            await deleteFromCloudinary(req.user.profile.resumePublicId, { resource_type: 'raw' });
        } catch (error) {
            // Do not block new upload when old asset cleanup fails.
            console.warn('Failed to delete old resume from Cloudinary:', error.message);
        }
    }

    // The file is already uploaded to Cloudinary by multer-storage-cloudinary if configured in routes
    // Or we use the uploadToCloudinary helper
    let result;
    if (req.file.path && req.file.path.startsWith('http')) {
        // Multer already handled upload
        result = {
            secure_url: req.file.path,
            public_id: req.file.filename || req.file.public_id || null
        };
    } else if (cloudinaryConfigured) {
        // Manual cloud upload if needed
        result = await uploadToCloudinary(req.file.path, 'resumes', {
            resource_type: 'raw',
            type: 'upload',
            access_mode: 'public'
        });
        safeRemoveLocalFile(req.file.path);
    } else {
        // Local disk fallback for development
        result = {
            secure_url: buildLocalUploadUrl(req, req.file.path),
            public_id: null
        };
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                'profile.resumeUrl': result.secure_url,
                'profile.resumePublicId': result.public_id || null
            }
        },
        { new: true }
    );

    res.json(ApiResponse.success(user, 'Resume uploaded successfully'));
});

/**
 * @swagger
 * /api/users/upload-avatar:
 *   post:
 *     summary: Upload avatar
 *     tags: [Users]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 */
const uploadAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw ApiError.badRequest('Please upload an avatar image');
    }

    // Delete old avatar if exists
    if (req.user.profile.avatarPublicId && cloudinaryConfigured) {
        try {
            await deleteFromCloudinary(req.user.profile.avatarPublicId);
        } catch (error) {
            // Do not block new upload when old asset cleanup fails.
            console.warn('Failed to delete old avatar from Cloudinary:', error.message);
        }
    }

    let result;
    if (req.file.path && req.file.path.startsWith('http')) {
        result = {
            secure_url: req.file.path,
            public_id: req.file.filename || req.file.public_id || null
        };
    } else if (cloudinaryConfigured) {
        result = await uploadToCloudinary(req.file.path, 'avatars');
        safeRemoveLocalFile(req.file.path);
    } else {
        result = {
            secure_url: buildLocalUploadUrl(req, req.file.path),
            public_id: null
        };
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                'profile.avatarUrl': result.secure_url,
                'profile.avatarPublicId': result.public_id || null
            }
        },
        { new: true }
    );

    res.json(ApiResponse.success(user, 'Avatar uploaded successfully'));
});

/**
 * Get secure resume access URLs (view + download)
 */
const getResumeAccess = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('profile.resumeUrl profile.resumePublicId');
    const resumeUrl = user?.profile?.resumeUrl;

    if (!resumeUrl) {
        throw ApiError.notFound('No resume uploaded');
    }

    const fileName = extractFileName(resumeUrl, 'resume');
    const fileExt = extractFileExtension(resumeUrl, 'pdf');
    const resumePublicId = user?.profile?.resumePublicId;
    const parsedAsset = parseCloudinaryRawAsset(resumeUrl);
    const effectivePublicId = resumePublicId || parsedAsset.publicId;
    const effectiveFormat = parsedAsset.format || fileExt;

    let viewUrl = resumeUrl;
    let downloadUrl = resumeUrl;

    if (cloudinaryConfigured && effectivePublicId) {
        try {
            viewUrl = cloudinary.utils.private_download_url(effectivePublicId, effectiveFormat, {
                resource_type: 'raw',
                type: 'upload',
                attachment: false,
                expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
            });

            downloadUrl = cloudinary.utils.private_download_url(effectivePublicId, effectiveFormat, {
                resource_type: 'raw',
                type: 'upload',
                attachment: fileName,
                expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
            });
        } catch (error) {
            // Fall back to stored URL if signed URL generation fails.
            console.warn('Failed to generate signed Cloudinary resume URL:', error.message);
        }
    }

    res.json(
        ApiResponse.success(
            {
                fileName,
                viewUrl,
                downloadUrl,
            },
            'Resume access URLs generated successfully'
        )
    );
});

/**
 * @swagger
 * /api/users/change-password:
 *   put:
 *     summary: Update user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword, confirmPassword]
 *     responses:
 *       200:
 *         description: Password updated successfully
 */
const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
        throw ApiError.badRequest('Missing required fields');
    }

    if (newPassword !== confirmPassword) {
        throw ApiError.badRequest('Passwords do not match');
    }

    // Find user with passwordHash
    const user = await User.findById(req.user._id).select('+passwordHash');

    // Verify currentPassword
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        throw ApiError.unauthorized('Invalid current password');
    }

    // Set new password (pre-save hook will hash it)
    user.password = newPassword;

    // Invalidate all refresh tokens (if implemented as a single field)
    user.refreshToken = undefined;

    await user.save();

    res.json(ApiResponse.success(null, 'Password updated successfully. Please login again.'));
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users-Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
const getAllUsers = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        role,
        isActive,
        isEmailVerified,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isEmailVerified !== undefined) query.isEmailVerified = isEmailVerified === 'true';

    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum);

    const total = await User.countDocuments(query);

    res.json(ApiResponse.paginated(users, { page: pageNum, limit: limitNum, total }));
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Users-Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string}
 *     responses:
 *       200:
 *         description: User details
 */
const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        throw ApiError.notFound('User not found');
    }

    // Get application/job counts
    const jobCount = await Job.countDocuments({ postedBy: user._id });
    const applicationCount = await Application.countDocuments({ applicant: user._id });

    const userData = user.toObject();
    userData.stats = {
        jobCount,
        applicationCount
    };

    res.json(ApiResponse.success(userData));
});

/**
 * @swagger
 * /api/users/{id}/status:
 *   patch:
 *     summary: Toggle user active status (Admin only)
 *     tags: [Users-Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string}
 *     responses:
 *       200:
 *         description: User status toggled successfully
 */
const toggleUserStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
        throw ApiError.notFound('User not found');
    }

    // Cannot deactivate other admins
    if (user.role === ROLES.ADMIN && req.user._id.toString() !== id) {
        throw ApiError.forbidden('You cannot deactivate other admins');
    }

    user.isActive = !user.isActive;
    await user.save();

    const status = user.isActive ? 'activated' : 'deactivated';

    // Trigger background notifications
    setImmediate(async () => {
        try {
            const statusLabel = user.isActive ? 'activated' : 'deactivated';

            // 1. In-app notification
            await createNotification({
                recipient: user._id,
                sender: req.user._id,
                type: 'system',
                title: 'Account Status Update',
                message: `Your account has been ${statusLabel} by an administrator.`,
            });

            // 2. Socket.io emission
            emitToUser(user._id, 'notification', {
                type: 'ACCOUNT_STATUS_UPDATE',
                message: `Your account has been ${statusLabel}.`
            });

            // 3. Force disconnect if deactivated
            if (!user.isActive) {
                disconnectUser(user._id);
            }

            // 4. Email notification
            await emailService.sendAccountStatusEmail(user, statusLabel);
        } catch (err) {
            console.error(`Failed to notify user ${user._id} of status change:`, err);
        }
    });

    res.json(ApiResponse.success(user, `User ${status} successfully`));
});

/**
 * @swagger
 * /api/users/{id}/role:
 *   patch:
 *     summary: Change user role (Admin only)
 *     tags: [Users-Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string}
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role: {type: string, enum: [jobseeker, recruiter]}
 *     responses:
 *       200:
 *         description: User role changed successfully
 */
const changeUserRole = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (![ROLES.JOBSEEKER, ROLES.RECRUITER].includes(role)) {
        throw ApiError.badRequest('Invalid role. Can only change to jobseeker or recruiter.');
    }

    const user = await User.findById(id);
    if (!user) {
        throw ApiError.notFound('User not found');
    }

    // Cannot change admin role
    if (user.role === ROLES.ADMIN) {
        throw ApiError.forbidden('Cannot change admin role');
    }

    user.role = role;
    await user.save();

    res.json(ApiResponse.success(user, `User role changed to ${role}`));
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Users-Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string}
 *       - in: query
 *         name: hardDelete
 *         schema: {type: boolean}
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { hardDelete = 'false' } = req.query;

    const user = await User.findById(id);
    if (!user) {
        throw ApiError.notFound('User not found');
    }

    if (hardDelete === 'true') {
        // Hard delete: remove user + cascade soft-delete their jobs/applications
        await Job.updateMany({ postedBy: id }, { status: 'closed', isActive: false });
        await Application.updateMany({ applicant: id }, { isArchived: true }); // Or whatever status means soft-deleted
        await User.findByIdAndDelete(id);
        return res.json(ApiResponse.success(null, 'User and their data hard-deleted successfully'));
    } else {
        // Soft delete: set isActive false, anonymize PII
        user.isActive = false;
        user.firstName = 'Deleted';
        user.lastName = 'User';
        user.email = `deleted_${id}@talentflow.local`; // Anonymize email
        user.passwordHash = 'deleted';
        await user.save();
        return res.json(ApiResponse.success(user, 'User soft-deleted and anonymized successfully'));
    }
});

module.exports = {
    updateProfile,
    uploadResume,
    uploadAvatar,
    getResumeAccess,
    updatePassword,
    getAllUsers,
    getUserById,
    toggleUserStatus,
    changeUserRole,
    deleteUser
};
