// src/controllers/appMonitoringController.js
const AppUsage = require('../models/AppUsage');
const Device = require('../models/Device');
const User = require('../models/User');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class AppMonitoringController {
  async getAppUsage(req, res) {
    try {
      const { deviceId } = req.params;
      const { period = 'day', limit = 50 } = req.query;

      const usages = await AppUsage.findByDeviceId(deviceId, parseInt(limit));

      // Calculate statistics
      const totalUsage = usages.reduce((sum, u) => sum + u.usageTime, 0);
      const topApps = usages.slice(0, 10);

      return ApiResponse.success(res, {
        deviceId,
        period,
        totalUsage,
        appCount: usages.length,
        topApps: topApps.map(u => u.toJSON()),
        allApps: usages.map(u => u.toJSON())
      });
    } catch (error) {
      logger.error('Get app usage error:', error);
      return ApiResponse.error(res, 'Failed to get app usage');
    }
  }

  async getUserAppUsage(req, res) {
    try {
      const { userId } = req.params;
      const { period = 'day', limit = 100 } = req.query;

      const user = await User.findById(userId);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      const usages = await AppUsage.findByUserId(userId, parseInt(limit));

      // Group by device
      const deviceGroups = {};
      for (const usage of usages) {
        if (!deviceGroups[usage.deviceId]) {
          deviceGroups[usage.deviceId] = {
            deviceId: usage.deviceId,
            apps: []
          };
        }
        deviceGroups[usage.deviceId].apps.push(usage.toJSON());
      }

      return ApiResponse.success(res, {
        userId,
        period,
        totalApps: usages.length,
        deviceGroups: Object.values(deviceGroups)
      });
    } catch (error) {
      logger.error('Get user app usage error:', error);
      return ApiResponse.error(res, 'Failed to get user app usage');
    }
  }

  async getRunningApps(req, res) {
    try {
      const { deviceId } = req.params;

      // TODO: Get running apps from device via socket
      // This would require real-time communication with device

      return ApiResponse.success(res, {
        deviceId,
        runningApps: [],
        message: 'Real-time running apps will be available when device is connected'
      });
    } catch (error) {
      logger.error('Get running apps error:', error);
      return ApiResponse.error(res, 'Failed to get running apps');
    }
  }

  async getAppDetails(req, res) {
    try {
      const { deviceId, appPackage } = req.params;

      const appUsage = await AppUsage.findByDeviceAndApp(deviceId, appPackage);
      if (!appUsage) {
        return ApiResponse.notFound(res, 'App not found on this device');
      }

      return ApiResponse.success(res, appUsage.toJSON());
    } catch (error) {
      logger.error('Get app details error:', error);
      return ApiResponse.error(res, 'Failed to get app details');
    }
  }

  async getAppStats(req, res) {
    try {
      const { deviceId } = req.params;
      const { period = 'day' } = req.query;

      const usages = await AppUsage.findByDeviceId(deviceId, 100);

      const stats = {
        deviceId,
        period,
        totalApps: usages.length,
        totalUsageTime: usages.reduce((sum, u) => sum + u.usageTime, 0),
        averageUsage: usages.length > 0 ? 
          usages.reduce((sum, u) => sum + u.usageTime, 0) / usages.length : 0,
        mostUsedApp: usages.length > 0 ? 
          usages.reduce((a, b) => a.usageTime > b.usageTime ? a : b) : null,
        appCategories: this.groupByCategory(usages)
      };

      return ApiResponse.success(res, stats);
    } catch (error) {
      logger.error('Get app stats error:', error);
      return ApiResponse.error(res, 'Failed to get app stats');
    }
  }

  async getScreenTime(req, res) {
    try {
      const { deviceId } = req.params;

      const usages = await AppUsage.findByDeviceId(deviceId, 100);
      const totalScreenTime = usages.reduce((sum, u) => sum + u.usageTime, 0);

      return ApiResponse.success(res, {
        deviceId,
        totalScreenTime,
        screenTimeInHours: (totalScreenTime / 3600).toFixed(2),
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Get screen time error:', error);
      return ApiResponse.error(res, 'Failed to get screen time');
    }
  }

  async getAppCategories(req, res) {
    try {
      const { deviceId } = req.params;

      const usages = await AppUsage.findByDeviceId(deviceId, 100);
      const categories = this.groupByCategory(usages);

      return ApiResponse.success(res, {
        deviceId,
        categories: Object.values(categories)
      });
    } catch (error) {
      logger.error('Get app categories error:', error);
      return ApiResponse.error(res, 'Failed to get app categories');
    }
  }

  groupByCategory(usages) {
    const categories = {};
    for (const usage of usages) {
      const category = usage.appCategory || 'Unknown';
      if (!categories[category]) {
        categories[category] = {
          category,
          apps: [],
          totalUsage: 0,
          appCount: 0
        };
      }
      categories[category].apps.push(usage.toJSON());
      categories[category].totalUsage += usage.usageTime;
      categories[category].appCount += 1;
    }
    return categories;
  }
}

module.exports = new AppMonitoringController();
