const EnrollmentPin = require('../models/EnrollmentPin');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Encryption = require('../utils/encryption');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const socketHandler = require('../sockets');
const { AUDIT_ACTIONS } = require('../utils/constants');

class PinController {
  async getAllPins(req, res) {
    try {
      const { userId, status } = req.query;
      const { page, limit, sort, order } = req.pagination;

      const filters = {};
      if (userId) filters.userId = userId;
      if (status) filters.status = status;

      const pins = await EnrollmentPin.findAll(filters, {
        limit,
        skip: (page - 1) * limit,
        sort,
        order
      });

      const total = await EnrollmentPin.count(filters);

      return ApiResponse.paginate(res,
        pins.map(p => p.toJSON()),
        total,
        page,
        limit
      );
    } catch (error) {
      logger.error('Get all pins error:', error);
      return ApiResponse.error(res, 'Failed to get pins');
    }
  }

  async getPinById(req, res) {
    try {
      const { id } = req.params;
      const pin = await EnrollmentPin.findById(id);

      if (!pin) {
        return ApiResponse.notFound(res, 'PIN not found');
      }

      return ApiResponse.success(res, pin.toJSON());
    } catch (error) {
      logger.error('Get pin by id error:', error);
      return ApiResponse.error(res, 'Failed to get pin');
    }
  }

  async createPin(req, res) {
    try {
      const { userId, deviceLimit, expiredDays } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      // Calculate expiry
      const expiredAt = new Date();
      expiredAt.setDate(expiredAt.getDate() + (expiredDays || 7));

      const pin = await EnrollmentPin.create({
        userId,
        deviceLimit: deviceLimit || 1,
        expiredAt,
        status: 'active'
      });

      // Log audit
      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.GENERATE_PIN,
        resourceType: 'pin',
        resourceId: pin.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      // Emit socket event
      socketHandler.emitToUser(userId, 'pin_created', pin.toJSON());

      return ApiResponse.created(res, pin.toJSON(), 'PIN generated successfully');
    } catch (error) {
      logger.error('Create pin error:', error);
      return ApiResponse.error(res, 'Failed to create pin');
    }
  }

  async updatePin(req, res) {
    try {
      const { id } = req.params;
      const { deviceLimit, status } = req.body;

      const pin = await EnrollmentPin.findById(id);
      if (!pin) {
        return ApiResponse.notFound(res, 'PIN not found');
      }

      await pin.update({
        deviceLimit: deviceLimit || pin.deviceLimit,
        status: status || pin.status
      });

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'update_pin',
        resourceType: 'pin',
        resourceId: pin.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, pin.toJSON(), 'PIN updated successfully');
    } catch (error) {
      logger.error('Update pin error:', error);
      return ApiResponse.error(res, 'Failed to update pin');
    }
  }

  async deletePin(req, res) {
    try {
      const { id } = req.params;

      const pin = await EnrollmentPin.findById(id);
      if (!pin) {
        return ApiResponse.notFound(res, 'PIN not found');
      }

      await pin.delete();

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.DELETE_PIN,
        resourceType: 'pin',
        resourceId: pin.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, null, 'PIN deleted successfully');
    } catch (error) {
      logger.error('Delete pin error:', error);
      return ApiResponse.error(res, 'Failed to delete pin');
    }
  }

  async disablePin(req, res) {
    try {
      const { id } = req.params;

      const pin = await EnrollmentPin.findById(id);
      if (!pin) {
        return ApiResponse.notFound(res, 'PIN not found');
      }

      await pin.disable();

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'disable_pin',
        resourceType: 'pin',
        resourceId: pin.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, pin.toJSON(), 'PIN disabled successfully');
    } catch (error) {
      logger.error('Disable pin error:', error);
      return ApiResponse.error(res, 'Failed to disable pin');
    }
  }

  async expirePin(req, res) {
    try {
      const { id } = req.params;

      const pin = await EnrollmentPin.findById(id);
      if (!pin) {
        return ApiResponse.notFound(res, 'PIN not found');
      }

      await pin.expire();

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'expire_pin',
        resourceType: 'pin',
        resourceId: pin.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, pin.toJSON(), 'PIN expired successfully');
    } catch (error) {
      logger.error('Expire pin error:', error);
      return ApiResponse.error(res, 'Failed to expire pin');
    }
  }

  async usePin(req, res) {
    try {
      const { id } = req.params;
      const { deviceId } = req.body;

      const pin = await EnrollmentPin.findById(id);
      if (!pin) {
        return ApiResponse.notFound(res, 'PIN not found');
      }

      await pin.use();

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.USE_PIN,
        resourceType: 'pin',
        resourceId: pin.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { deviceId }
      });

      // Emit socket event
      socketHandler.emitPinUsed(pin);

      return ApiResponse.success(res, pin.toJSON(), 'PIN used successfully');
    } catch (error) {
      logger.error('Use pin error:', error);
      return ApiResponse.error(res, error.message || 'Failed to use pin');
    }
  }

  async getActivePins(req, res) {
    try {
      const pins = await EnrollmentPin.findActive();
      return ApiResponse.success(res, pins.map(p => p.toJSON()));
    } catch (error) {
      logger.error('Get active pins error:', error);
      return ApiResponse.error(res, 'Failed to get active pins');
    }
  }

  async getUsedPins(req, res) {
    try {
      const pins = await EnrollmentPin.findAll({ status: 'used' });
      return ApiResponse.success(res, pins.map(p => p.toJSON()));
    } catch (error) {
      logger.error('Get used pins error:', error);
      return ApiResponse.error(res, 'Failed to get used pins');
    }
  }

  async getExpiredPins(req, res) {
    try {
      const pins = await EnrollmentPin.findAll({ status: 'expired' });
      return ApiResponse.success(res, pins.map(p => p.toJSON()));
    } catch (error) {
      logger.error('Get expired pins error:', error);
      return ApiResponse.error(res, 'Failed to get expired pins');
    }
  }
}

module.exports = new PinController();
