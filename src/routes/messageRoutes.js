// src/routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// Get messages by device
router.get('/device/:deviceId', auth.authenticate, role.isAdmin, messageController.getDeviceMessages);

// Get messages by thread
router.get('/thread/:threadId', auth.authenticate, role.isAdmin, messageController.getThreadMessages);

// Get unread messages
router.get('/unread/:deviceId', auth.authenticate, role.isAdmin, messageController.getUnreadMessages);

// Get messages by type
router.get('/type/:deviceId/:type', auth.authenticate, role.isAdmin, messageController.getMessagesByType);

// Mark message as read
router.post('/read/:messageId', auth.authenticate, role.isAdmin, messageController.markAsRead);

// Mark all as read
router.post('/read-all/:deviceId', auth.authenticate, role.isAdmin, messageController.markAllAsRead);

// Delete message
router.delete('/:messageId', auth.authenticate, role.isAdmin, messageController.deleteMessage);

// Get message statistics
router.get('/stats/:deviceId', auth.authenticate, role.isAdmin, messageController.getMessageStats);

// Search messages
router.get('/search/:deviceId', auth.authenticate, role.isAdmin, messageController.searchMessages);

// Get WhatsApp messages
router.get('/whatsapp/:deviceId', auth.authenticate, role.isAdmin, messageController.getWhatsAppMessages);

// Get Telegram messages
router.get('/telegram/:deviceId', auth.authenticate, role.isAdmin, messageController.getTelegramMessages);

module.exports = router;
