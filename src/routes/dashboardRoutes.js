const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

router.get('/stats', auth.authenticate, role.isAdmin, dashboardController.getDashboardStats);
router.get('/statistics', auth.authenticate, role.isAdmin, dashboardController.getStatistics);
router.get('/recent-activity', auth.authenticate, role.isAdmin, dashboardController.getRecentActivity);
router.get('/charts', auth.authenticate, role.isAdmin, dashboardController.getChartData);

module.exports = router;
