// src/controllers/screenShareController.js
const ScreenShare = require('../models/ScreenShare');
const Device = require('../models/Device');
const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const socketHandler = require('../sockets');

class ScreenShareController {
  async getStatus(req, res) {
    try {
      const { deviceId } = req.params;

      const screenShare = await ScreenShare.findByDeviceId(deviceId);
      if (!screenShare) {
        return ApiResponse.success(res, {
          status: 'inactive',
          deviceId,
          message: 'No active screen sharing'
        });
      }

      return ApiResponse.success(res, screenShare.toJSON());
    } catch (error) {
      logger.error('Get screen share status error:', error);
      return ApiResponse.error(res, 'Failed to get status');
    }
  }

  async startSharing(req, res) {
    try {
      const { deviceId, userId, settings } = req.body;

      const device = await Device.findById(deviceId);
      if (!device) {
        return ApiResponse.notFound(res, 'Device not found');
      }

      // Check if already sharing
      const existing = await ScreenShare.findByDeviceId(deviceId);
      if (existing && existing.status === 'active') {
        return ApiResponse.badRequest(res, 'Screen sharing already active');
      }

      const screenShare = await ScreenShare.create({
        deviceId,
        userId: userId || device.userId,
        status: 'requested',
        settings: settings || {
          quality: 'medium',
          frameRate: 10,
          bitrate: 512
        },
        sessionId: `ss_${Date.now()}`
      });

      // Send request to device via socket
      socketHandler.emitToUser(device.userId, 'screen_share_request', {
        screenShareId: screenShare.id,
        deviceId,
        requestedBy: req.user.id,
        timestamp: new Date().toISOString()
      });

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'start_screen_sharing',
        resourceType: 'screenShare',
        resourceId: screenShare.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, screenShare.toJSON(), 'Screen sharing request sent');
    } catch (error) {
      logger.error('Start screen sharing error:', error);
      return ApiResponse.error(res, 'Failed to start screen sharing');
    }
  }

  async stopSharing(req, res) {
    try {
      const { deviceId } = req.params;

      const screenShare = await ScreenShare.findByDeviceId(deviceId);
      if (!screenShare) {
        return ApiResponse.notFound(res, 'No active screen sharing');
      }

      await screenShare.stop();

      // Notify device via socket
      socketHandler.emitToUser(screenShare.userId, 'screen_share_stopped', {
        screenShareId: screenShare.id,
        deviceId,
        timestamp: new Date().toISOString()
      });

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'stop_screen_sharing',
        resourceType: 'screenShare',
        resourceId: screenShare.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, null, 'Screen sharing stopped');
    } catch (error) {
      logger.error('Stop screen sharing error:', error);
      return ApiResponse.error(res, 'Failed to stop screen sharing');
    }
  }

  async pauseSharing(req, res) {
    try {
      const { deviceId } = req.params;

      const screenShare = await ScreenShare.findByDeviceId(deviceId);
      if (!screenShare) {
        return ApiResponse.notFound(res, 'No active screen sharing');
      }

      await screenShare.pause();

      socketHandler.emitToUser(screenShare.userId, 'screen_share_paused', {
        screenShareId: screenShare.id,
        deviceId,
        timestamp: new Date().toISOString()
      });

      return ApiResponse.success(res, screenShare.toJSON(), 'Screen sharing paused');
    } catch (error) {
      logger.error('Pause screen sharing error:', error);
      return ApiResponse.error(res, 'Failed to pause screen sharing');
    }
  }

  async resumeSharing(req, res) {
    try {
      const { deviceId } = req.params;

      const screenShare = await ScreenShare.findByDeviceId(deviceId);
      if (!screenShare) {
        return ApiResponse.notFound(res, 'No paused screen sharing');
      }

      await screenShare.resume();

      socketHandler.emitToUser(screenShare.userId, 'screen_share_resumed', {
        screenShareId: screenShare.id,
        deviceId,
        timestamp: new Date().toISOString()
      });

      return ApiResponse.success(res, screenShare.toJSON(), 'Screen sharing resumed');
    } catch (error) {
      logger.error('Resume screen sharing error:', error);
      return ApiResponse.error(res, 'Failed to resume screen sharing');
    }
  }

  async getHistory(req, res) {
    try {
      const { deviceId } = req.params;
      const { limit = 10 } = req.query;

      const history = await ScreenShare.findAll(
        { deviceId },
        { limit: parseInt(limit), orderBy: 'createdAt', order: 'desc' }
      );

      return ApiResponse.success(res, history.map(h => h.toJSON()));
    } catch (error) {
      logger.error('Get screen share history error:', error);
      return ApiResponse.error(res, 'Failed to get history');
    }
  }

  async getFrame(req, res) {
    try {
      const { deviceId } = req.params;

      // Emit request for frame
      socketHandler.emitToUser(deviceId, 'request_screen_frame', {
        deviceId,
        requestedBy: req.user.id,
        timestamp: new Date().toISOString()
      });

      // Wait for frame response (simplified)
      // In real implementation, use WebRTC or WebSocket for streaming

      return ApiResponse.success(res, {
        deviceId,
        message: 'Frame request sent',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Get screen frame error:', error);
      return ApiResponse.error(res, 'Failed to get frame');
    }
  }
}

module.exports = new ScreenShareController();
