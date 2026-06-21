const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { validateNotification, validateNotificationId } = require('../validators/notificationValidator');
const validator = require('../middleware/validator');
const role = require('../middleware/role');
const auth = require('../middleware/auth');

// Admin routes
router.get('/', role.isAdmin, validator.validatePagination, notificationController.getAllNotifications);
router.get('/:id', role.isAdmin, validateNotificationId, validator.validate, notificationController.getNotificationById);
router.post('/', role.isAdmin, validateNotification, validator.validate, notificationController.createNotification);
router.delete('/:id', role.isAdmin, validateNotificationId, validator.validate, notificationController.deleteNotification);

// User notification
router.get('/user/me', auth.authenticate, notificationController.getMyNotifications);
router.post('/user/mark-read', auth.authenticate, notificationController.markAsRead);
router.post('/user/mark-all-read', auth.authenticate, notificationController.markAllAsRead);

// Notification management
router.post('/:id/send', role.isAdmin, validateNotificationId, validator.validate, notificationController.sendNotification);
router.post('/broadcast', role.isAdmin, validateNotification, validator.validate, notificationController.broadcastNotification);

module.exports = router;
