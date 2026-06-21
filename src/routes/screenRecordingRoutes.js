// src/routes/screenRecordingRoutes.js
const express = require('express');
const router = express.Router();
const screenRecordingController = require('../controllers/screenRecordingController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// Get recording status
router.get('/status/:deviceId', auth.authenticate, role.isAdmin, screenRecordingController.getStatus);

// Start recording
router.post('/start', auth.authenticate, role.isAdmin, screenRecordingController.startRecording);

// Stop recording
router.post('/stop/:deviceId', auth.authenticate, role.isAdmin, screenRecordingController.stopRecording);

// Pause recording
router.post('/pause/:deviceId', auth.authenticate, role.isAdmin, screenRecordingController.pauseRecording);

// Resume recording
router.post('/resume/:deviceId', auth.authenticate, role.isAdmin, screenRecordingController.resumeRecording);

// Get recording history
router.get('/history/:deviceId', auth.authenticate, role.isAdmin, screenRecordingController.getHistory);

// Get recording file
router.get('/file/:recordingId', auth.authenticate, role.isAdmin, screenRecordingController.getRecordingFile);

// Delete recording
router.delete('/:recordingId', auth.authenticate, role.isAdmin, screenRecordingController.deleteRecording);

module.exports = router;
