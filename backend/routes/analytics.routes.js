const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { verifyJWT } = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

// Require authentication for all analytics routes
router.use(verifyJWT);

// Recruiter analytics - restricted to recruiters
router.get('/recruiter', roleGuard('recruiter'), analyticsController.getRecruiterAnalytics);

// Admin analytics - restricted to admins
router.get('/admin', roleGuard('admin'), analyticsController.getAdminAnalytics);

module.exports = router;
