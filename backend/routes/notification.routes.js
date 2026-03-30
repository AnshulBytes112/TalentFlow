const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

// All notification routes require authentication
router.use(verifyJWT);

router.get('/', notificationController.getMyNotifications);
router.get('/unread-count', notificationController.getUnreadCount);

router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
