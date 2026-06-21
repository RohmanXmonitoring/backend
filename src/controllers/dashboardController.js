const User = require('../models/User');
const Device = require('../models/Device');
const License = require('../models/License');
const EnrollmentPin = require('../models/EnrollmentPin');
const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const socketHandler = require('../sockets');
const redis = require('../config/redis');

class DashboardController {
  async getDashboardStats(req, res) {
    try {
      // Check cache
      let stats = null;
      if (redis.isConnected()) {
        stats = await redis.getCache('dashboard_stats');
        if (stats) {
          return ApiResponse.success(res, stats);
        }
      }

      // Get stats
      const [
        totalUsers,
        totalDevices,
        onlineDevices,
        offlineDevices,
        activeLicenses,
        expiredLicenses,
        totalPins,
        activePins
      ] = await Promise.all([
        User.count({ status: 'active' }),
        Device.count({ status: 'active' }),
        Device.count({ isOnline: true }),
        Device.count({ isOnline: false }),
        License.count({ status: 'active' }),
        License.count({ expired: true }),
        EnrollmentPin.count({ status: 'active' }),
        EnrollmentPin.count({ status: 'active', expiredAt: { $gt: new Date() } })
      ]);

      stats = {
        users: {
          total: totalUsers,
          active: totalUsers,
          suspended: await User.count({ status: 'suspended' })
        },
        devices: {
          total: totalDevices,
          online: onlineDevices,
          offline: offlineDevices
        },
        licenses: {
          active: activeLicenses,
          expired: expiredLicenses,
          total: activeLicenses + expiredLicenses
        },
        pins: {
          total: totalPins,
          active: activePins,
          used: await EnrollmentPin.count({ status: 'used' })
        },
        timestamp: new Date().toISOString()
      };

      // Cache stats
      if (redis.isConnected()) {
        await redis.setCache('dashboard_stats', stats, 60); // Cache for 60 seconds
      }

      // Emit socket event
      socketHandler.emitDashboardUpdate(stats);

      return ApiResponse.success(res, stats);
    } catch (error) {
      logger.error('Get dashboard stats error:', error);
      return ApiResponse.error(res, 'Failed to get dashboard stats');
    }
  }

  async getStatistics(req, res) {
    try {
      const { period = 'week' } = req.query;

      // Get statistics based on period
      const stats = await this.getStatisticsData(period);

      return ApiResponse.success(res, stats);
    } catch (error) {
      logger.error('Get statistics error:', error);
      return ApiResponse.error(res, 'Failed to get statistics');
    }
  }

  async getStatisticsData(period) {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }

    // Get audit logs for the period
    const logs = await AuditLog.findAll({
      fromDate: startDate,
      toDate: new Date()
    });

    // Group by action
    const actions = {};
    for (const log of logs) {
      if (!actions[log.action]) {
        actions[log.action] = 0;
      }
      actions[log.action]++;
    }

    // Get daily statistics
    const dailyStats = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dailyStats[dateStr] = {
        users: 0,
        devices: 0,
        licenses: 0,
        pins: 0
      };
    }

    return {
      period,
      startDate,
      endDate: new Date(),
      actions,
      dailyStats,
      totalLogs: logs.length
    };
  }

  async getRecentActivity(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 20;

      // Get recent audit logs
      const logs = await AuditLog.getRecent(limit);

      // Enrich with user data
      const activities = [];
      for (const log of logs) {
        const user = await User.findById(log.userId);
        activities.push({
          id: log.id,
          action: log.action,
          user: user ? user.toJSON() : { id: log.userId },
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          details: log.details,
          status: log.status,
          timestamp: log.timestamp,
          ipAddress: log.ipAddress
        });
      }

      return ApiResponse.success(res, activities);
    } catch (error) {
      logger.error('Get recent activity error:', error);
      return ApiResponse.error(res, 'Failed to get recent activity');
    }
  }

  async getChartData(req, res) {
    try {
      const { type = 'users' } = req.query;

      let data = [];
      const now = new Date();
      const startDate = new Date(now.setDate(now.getDate() - 30));

      switch (type) {
        case 'users':
          data = await this.getUserChartData(startDate, now);
          break;
        case 'devices':
          data = await this.getDeviceChartData(startDate, now);
          break;
        case 'licenses':
          data = await this.getLicenseChartData(startDate, now);
          break;
        case 'pins':
          data = await this.getPinChartData(startDate, now);
          break;
        default:
          data = await this.getUserChartData(startDate, now);
      }

      return ApiResponse.success(res, {
        type,
        data,
        labels: data.map(d => d.date),
        values: data.map(d => d.value)
      });
    } catch (error) {
      logger.error('Get chart data error:', error);
      return ApiResponse.error(res, 'Failed to get chart data');
    }
  }

  async getUserChartData(startDate, endDate) {
    const data = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const count = await User.count({
        createdAt: {
          $gte: new Date(d.setHours(0, 0, 0, 0)),
          $lte: new Date(d.setHours(23, 59, 59, 999))
        }
      });
      data.push({ date: dateStr, value: count });
    }
    return data;
  }

  async getDeviceChartData(startDate, endDate) {
    const data = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const count = await Device.count({
        createdAt: {
          $gte: new Date(d.setHours(0, 0, 0, 0)),
          $lte: new Date(d.setHours(23, 59, 59, 999))
        }
      });
      data.push({ date: dateStr, value: count });
    }
    return data;
  }

  async getLicenseChartData(startDate, endDate) {
    const data = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const count = await License.count({
        issuedAt: {
          $gte: new Date(d.setHours(0, 0, 0, 0)),
          $lte: new Date(d.setHours(23, 59, 59, 999))
        }
      });
      data.push({ date: dateStr, value: count });
    }
    return data;
  }

  async getPinChartData(startDate, endDate) {
    const data = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const count = await EnrollmentPin.count({
        createdAt: {
          $gte: new Date(d.setHours(0, 0, 0, 0)),
          $lte: new Date(d.setHours(23, 59, 59, 999))
        }
      });
      data.push({ date: dateStr, value: count });
    }
    return data;
  }
}

module.exports = new DashboardController();
