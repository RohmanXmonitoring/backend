const Device = require('../models/Device');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const socketHandler = require('../sockets');
const redis = require('../config/redis');
const { AUDIT_ACTIONS } = require('../utils/constants');

class DeviceController {
  async getAllDevices(req, res) {
    try {
      const { userId, status, isOnline, lostMode } = req.query;
      const { page, limit, sort, order } = req.pagination;

      const filters = {};
      if (userId) filters.userId = userId;
      if (status) filters.status = status;
      if (isOnline !== undefined) filters.isOnline = isOnline === 'true';
      if (lostMode !== undefined) filters.lostMode = lostMode === 'true';

      const devices = await Device.findAll(filters, {
        limit,
        skip: (page - 1) * limit,
        sort,
        order
      });

      const total = await Device.count(filters);

      return ApiResponse.paginate(res,
        devices.map(d => d.toJSON()),
        total,
        page,
        limit
      );
    } catch (error) {
      logger.error('Get all devices error:', error);
      return ApiResponse.error(res, 'Failed to get devices');
    }
  }

  async getDeviceById(req, res) {
    try {
      const { id } = req.params;
      const device = await Device.findById(id);

      if (!device) {
        return ApiResponse.notFound(res, 'Device not found');
      }

      return ApiResponse.success(res, device.toJSON());
    } catch (error) {
      logger.error('Get device by id error:', error);
      return ApiResponse.error(res, 'Failed to get device');
    }
  }

  async updateDevice(req, res) {
    try {
      const { id } = req.params;
      const { deviceName, status } = req.body;

      const device = await Device.findById(id);
      if (!device) {
        return ApiResponse.notFound(res, 'Device not found');
      }

      await device.update({
        deviceName: deviceName || device.deviceName,
        status: status || device.status
      });

      // Log audit
      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.UPDATE_DEVICE,
        resourceType: 'device',
        resourceId: device.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      // Emit socket event
      socketHandler.emitDeviceUpdated(device);

      return ApiResponse.success(res, device.toJSON(), 'Device updated successfully');
    } catch (error) {
      logger.error('Update device error:', error);
      return ApiResponse.error(res, 'Failed to update device');
    }
  }

  async deleteDevice(req, res) {
    try {
      const { id } = req.params;

      const device = await Device.findById(id);
      if (!device) {
        return ApiResponse.notFound(res, 'Device not found');
      }

      await device.delete();

      // Log audit
      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.DELETE_DEVICE,
        resourceType: 'device',
        resourceId: device.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, null, 'Device deleted successfully');
    } catch (error) {
      logger.error('Delete device error:', error);
      return ApiResponse.error(res, 'Failed to delete device');
    }
  }

  async renameDevice(req, res) {
    try {
      const { id } = req.params;
      const { deviceName } = req.body;

      const device = await Device.findById(id);
      if (!device) {
        return ApiResponse.notFound(res, 'Device not found');
      }

      await device.update({ deviceName });

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'rename_device',
        resourceType: 'device',
        resourceId: device.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { newName: deviceName }
      });

      return ApiResponse.success(res, device.toJSON(), 'Device renamed successfully');
    } catch (error) {
      logger.error('Rename device error:', error);
      return ApiResponse.error(res, 'Failed to rename device');
    }
  }

  async resetDevice(req, res) {
    try {
      const { id } = req.params;

      const device = await Device.findById(id);
      if (!device) {
        return ApiResponse.notFound(res, 'Device not found');
      }

      await device.update({
        isOnline: false,
        networkStatus: 'offline',
        status: 'inactive'
      });

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'reset_device',
        resourceType: 'device',
        resourceId: device.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, device.toJSON(), 'Device reset successfully');
    } catch (error) {
      logger.error('Reset device error:', error);
      return ApiResponse.error(res, 'Failed to reset device');
    }
  }

  async setLostMode(req, res) {
    try {
      const { id } = req.params;

      const device = await Device.findById(id);
      if (!device) {
        return ApiResponse.notFound(res, 'Device not found');
      }

      await device.setLostMode();

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'set_lost_mode',
        resourceType: 'device',
        resourceId: device.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, device.toJSON(), 'Lost mode activated');
    } catch (error) {
      logger.error('Set lost mode error:', error);
      return ApiResponse.error(res, 'Failed to set lost mode');
    }
  }

  async disableLostMode(req, res) {
    try {
      const { id } = req.params;

      const device = await Device.findById(id);
      if (!device) {
        return ApiResponse.notFound(res, 'Device not found');
      }

      await device.disableLostMode();

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'disable_lost_mode',
        resourceType: 'device',
        resourceId: device.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, device.toJSON(), 'Lost mode disabled');
    } catch (error) {
      logger.error('Disable lost mode error:', error);
      return ApiResponse.error(res, 'Failed to disable lost mode');
    }
  }

  async getOnlineDevices(req, res) {
    try {
      const devices = await Device.findOnline();
      return ApiResponse.success(res, devices.map(d => d.toJSON()));
    } catch (error) {
      logger.error('Get online devices error:', error);
      return ApiResponse.error(res, 'Failed to get online devices');
    }
  }

  async getOfflineDevices(req, res) {
    try {
      const devices = await Device.findOffline();
      return ApiResponse.success(res, devices.map(d => d.toJSON()));
    } catch (error) {
      logger.error('Get offline devices error:', error);
      return ApiResponse.error(res, 'Failed to get offline devices');
    }
  }
}

module.exports = new DeviceController();
