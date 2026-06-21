// src/routes/screenShareRoutes.js
const express = require('express');
const router = express.Router();
const screenShareController = require('../controllers/screenShareController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// Get screen share status
router.get('/status/:deviceId', auth.authenticate, role.isAdmin, screenShareController.getStatus);

// Start screen sharing
router.post('/start', auth.authenticate, role.isAdmin, screenShareController.startSharing);

// Stop screen sharing
router.post('/stop/:deviceId', auth.authenticate, role.isAdmin, screenShareController.stopSharing);

// Pause screen sharing
router.post('/pause/:deviceId', auth.authenticate, role.isAdmin, screenShareController.pauseSharing);

// Resume screen sharing
router.post('/resume/:deviceId', auth.authenticate, role.isAdmin, screenShareController.resumeSharing);

// Get screen sharing history
router.get('/history/:deviceId', auth.authenticate, role.isAdmin, screenShareController.getHistory);

// Get frame from device
router.get('/frame/:deviceId', auth.authenticate, role.isAdmin, screenShareController.getFrame);

module.exports = router;
