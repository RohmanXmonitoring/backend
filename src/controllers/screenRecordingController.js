// src/controllers/screenRecordingController.js
const ScreenRecording = require('../models/ScreenRecording');
const Device = require('../models/Device');
const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const socketHandler = require('../sockets');

class ScreenRecordingController {
  async getStatus(req, res) {
    try {
      const { deviceId } = req.params;

      const recording = await ScreenRecording.findByDeviceId(deviceId);
      if (!recording) {
        return ApiResponse.success(res, {
          status: 'inactive',
          deviceId,
          message: 'No active recording'
        });
      }

      return ApiResponse.success(res, recording.toJSON());
    } catch (error) {
      logger.error('Get recording status error:', error);
      return ApiResponse.error(res, 'Failed to get status');
    }
  }

  async startRecording(req, res) {
    try {
      const { deviceId, userId, settings, duration } = req.body;

      const device = await Device.findById(deviceId);
      if (!device) {
        return ApiResponse.notFound(res, 'Device not found');
      }

      const existing = await ScreenRecording.findByDeviceId(deviceId);
      if (existing && existing.status === 'active') {
        return ApiResponse.badRequest(res, 'Recording already in progress');
      }

      const recording = await ScreenRecording.create({
        deviceId,
        userId: userId || device.userId,
        status: 'requested',
        settings: settings || {
          quality: 'medium',
          frameRate: 15,
          bitrate: 1024,
          resolution: '720p'
        },
        duration: duration || 0,
        sessionId: `rec_${Date.now()}`
      });

      // Send request to device via socket
      socketHandler.emitToUser(device.userId, 'screen_recording_request', {
        recordingId: recording.id,
        deviceId,
        requestedBy: req.user.id,
        settings: recording.settings,
        timestamp: new Date().toISOString()
      });

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'start_screen_recording',
        resourceType: 'screenRecording',
        resourceId: recording.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, recording.toJSON(), 'Recording request sent');
    } catch (error) {
      logger.error('Start recording error:', error);
      return ApiResponse.error(res, 'Failed to start recording');
    }
  }

  async stopRecording(req, res) {
    try {
      const { deviceId } = req.params;

      const recording = await ScreenRecording.findByDeviceId(deviceId);
      if (!recording) {
        return ApiResponse.notFound(res, 'No active recording');
      }

      await recording.stop();

      socketHandler.emitToUser(recording.userId, 'screen_recording_stopped', {
        recordingId: recording.id,
        deviceId,
        timestamp: new Date().toISOString()
      });

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'stop_screen_recording',
        resourceType: 'screenRecording',
        resourceId: recording.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, recording.toJSON(), 'Recording stopped');
    } catch (error) {
      logger.error('Stop recording error:', error);
      return ApiResponse.error(res, 'Failed to stop recording');
    }
  }

  async pauseRecording(req, res) {
    try {
      const { deviceId } = req.params;

      const recording = await ScreenRecording.findByDeviceId(deviceId);
      if (!recording) {
        return ApiResponse.notFound(res, 'No active recording');
      }

      await recording.pause();

      socketHandler.emitToUser(recording.userId, 'screen_recording_paused', {
        recordingId: recording.id,
        deviceId,
        timestamp: new Date().toISOString()
      });

      return ApiResponse.success(res, recording.toJSON(), 'Recording paused');
    } catch (error) {
      logger.error('Pause recording error:', error);
      return ApiResponse.error(res, 'Failed to pause recording');
    }
  }

  async resumeRecording(req, res) {
    try {
      const { deviceId } = req.params;

      const recording = await ScreenRecording.findByDeviceId(deviceId);
      if (!recording) {
        return ApiResponse.notFound(res, 'No paused recording');
      }

      await recording.resume();

      socketHandler.emitToUser(recording.userId, 'screen_recording_resumed', {
        recordingId: recording.id,
        deviceId,
        timestamp: new Date().toISOString()
      });

      return ApiResponse.success(res, recording.toJSON(), 'Recording resumed');
    } catch (error) {
      logger.error('Resume recording error:', error);
      return ApiResponse.error(res, 'Failed to resume recording');
    }
  }

  async getHistory(req, res) {
    try {
      const { deviceId } = req.params;
      const { limit = 10 } = req.query;

      const history = await ScreenRecording.findAll(
        { deviceId },
        { limit: parseInt(limit), orderBy: 'createdAt', order: 'desc' }
      );

      return ApiResponse.success(res, history.map(h => h.toJSON()));
    } catch (error) {
      logger.error('Get recording history error:', error);
      return ApiResponse.error(res, 'Failed to get history');
    }
  }

  async getRecordingFile(req, res) {
    try {
      const { recordingId } = req.params;

      const recording = await ScreenRecording.findById(recordingId);
      if (!recording) {
        return ApiResponse.notFound(res, 'Recording not found');
      }

      // TODO: Implement file download
      // return res.download(recording.filePath);

      return ApiResponse.success(res, {
        recordingId: recording.id,
        fileUrl: recording.fileUrl,
        fileSize: recording.fileSize,
        duration: recording.duration
      });
    } catch (error) {
      logger.error('Get recording file error:', error);
      return ApiResponse.error(res, 'Failed to get recording file');
    }
  }

  async deleteRecording(req, res) {
    try {
      const { recordingId } = req.params;

      const recording = await ScreenRecording.findById(recordingId);
      if (!recording) {
        return ApiResponse.notFound(res, 'Recording not found');
      }

      // TODO: Delete file from storage
      // await deleteFile(recording.fileUrl);

      await recording.update({ status: 'deleted' });

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'delete_recording',
        resourceType: 'screenRecording',
        resourceId: recording.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, null, 'Recording deleted');
    } catch (error) {
      logger.error('Delete recording error:', error);
      return ApiResponse.error(res, 'Failed to delete recording');
    }
  }
}

module.exports = new ScreenRecordingController();
