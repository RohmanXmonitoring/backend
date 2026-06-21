// src/routes/appMonitoringRoutes.js
const express = require('express');
const router = express.Router();
const appMonitoringController = require('../controllers/appMonitoringController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// Get app usage
router.get('/usage/:deviceId', auth.authenticate, role.isAdmin, appMonitoringController.getAppUsage);

// Get app usage by user
router.get('/usage/user/:userId', auth.authenticate, role.isAdmin, appMonitoringController.getUserAppUsage);

// Get running apps
router.get('/running/:deviceId', auth.authenticate, role.isAdmin, appMonitoringController.getRunningApps);

// Get app details
router.get('/app/:deviceId/:appPackage', auth.authenticate, role.isAdmin, appMonitoringController.getAppDetails);

// Get app usage statistics
router.get('/stats/:deviceId', auth.authenticate, role.isAdmin, appMonitoringController.getAppStats);

// Get screen time
router.get('/screentime/:deviceId', auth.authenticate, role.isAdmin, appMonitoringController.getScreenTime);

// Get app categories
router.get('/categories/:deviceId', auth.authenticate, role.isAdmin, appMonitoringController.getAppCategories);

module.exports = router;
