const License = require('../models/License');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Encryption = require('../utils/encryption');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const socketHandler = require('../sockets');
const { AUDIT_ACTIONS, LICENSE_TYPES, LICENSE_DURATIONS } = require('../utils/constants');

class LicenseController {
  async getAllLicenses(req, res) {
    try {
      const { userId, status, type } = req.query;
      const { page, limit, sort, order } = req.pagination;

      const filters = {};
      if (userId) filters.userId = userId;
      if (status) filters.status = status;
      if (type) filters.type = type;

      const licenses = await License.findAll(filters, {
        limit,
        skip: (page - 1) * limit,
        sort,
        order
      });

      const total = await License.count(filters);

      return ApiResponse.paginate(res,
        licenses.map(l => l.toJSON()),
        total,
        page,
        limit
      );
    } catch (error) {
      logger.error('Get all licenses error:', error);
      return ApiResponse.error(res, 'Failed to get licenses');
    }
  }

  async getLicenseById(req, res) {
    try {
      const { id } = req.params;
      const license = await License.findById(id);

      if (!license) {
        return ApiResponse.notFound(res, 'License not found');
      }

      return ApiResponse.success(res, license.toJSON());
    } catch (error) {
      logger.error('Get license by id error:', error);
      return ApiResponse.error(res, 'Failed to get license');
    }
  }

  async createLicense(req, res) {
    try {
      const { userId, type } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      // Check if user already has active license
      const existingLicenses = await License.findAll({ 
        userId, 
        status: 'active' 
      });
      
      if (existingLicenses.length > 0) {
        return ApiResponse.badRequest(res, 'User already has an active license');
      }

      // Calculate expiry
      const duration = LICENSE_DURATIONS[type] || 30;
      const expiredAt = new Date();
      expiredAt.setDate(expiredAt.getDate() + duration);

      // Generate license key
      const licenseKey = Encryption.generateLicenseKey();

      const license = await License.create({
        licenseKey,
        type,
        userId,
        status: 'active',
        issuedAt: new Date(),
        expiredAt
      });

      // Update user's license type
      await user.update({ licenseType: type });

      // Log audit
      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.CREATE_LICENSE,
        resourceType: 'license',
        resourceId: license.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      // Emit socket event
      socketHandler.emitToUser(userId, 'license_created', license.toJSON());

      return ApiResponse.created(res, license.toJSON(), 'License created successfully');
    } catch (error) {
      logger.error('Create license error:', error);
      return ApiResponse.error(res, 'Failed to create license');
    }
  }

  async updateLicense(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const license = await License.findById(id);
      if (!license) {
        return ApiResponse.notFound(res, 'License not found');
      }

      await license.update({ status });

      // Log audit
      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.UPDATE_LICENSE,
        resourceType: 'license',
        resourceId: license.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, license.toJSON(), 'License updated successfully');
    } catch (error) {
      logger.error('Update license error:', error);
      return ApiResponse.error(res, 'Failed to update license');
    }
  }

  async deleteLicense(req, res) {
    try {
      const { id } = req.params;

      const license = await License.findById(id);
      if (!license) {
        return ApiResponse.notFound(res, 'License not found');
      }

      await license.delete();

      // Log audit
      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.DELETE_LICENSE,
        resourceType: 'license',
        resourceId: license.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, null, 'License deleted successfully');
    } catch (error) {
      logger.error('Delete license error:', error);
      return ApiResponse.error(res, 'Failed to delete license');
    }
  }

  async extendLicense(req, res) {
    try {
      const { id } = req.params;
      const { days } = req.body;

      const license = await License.findById(id);
      if (!license) {
        return ApiResponse.notFound(res, 'License not found');
      }

      await license.extend(days || 30);

      // Log audit
      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.EXTEND_LICENSE,
        resourceType: 'license',
        resourceId: license.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { extendedDays: days || 30 }
      });

      // Emit socket event
      socketHandler.emitToUser(license.userId, 'license_extended', license.toJSON());

      return ApiResponse.success(res, license.toJSON(), 'License extended successfully');
    } catch (error) {
      logger.error('Extend license error:', error);
      return ApiResponse.error(res, 'Failed to extend license');
    }
  }

  async disableLicense(req, res) {
    try {
      const { id } = req.params;

      const license = await License.findById(id);
      if (!license) {
        return ApiResponse.notFound(res, 'License not found');
      }

      await license.disable();

      // Log audit
      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'disable_license',
        resourceType: 'license',
        resourceId: license.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, license.toJSON(), 'License disabled successfully');
    } catch (error) {
      logger.error('Disable license error:', error);
      return ApiResponse.error(res, 'Failed to disable license');
    }
  }

  async activateLicense(req, res) {
    try {
      const { id } = req.params;

      const license = await License.findById(id);
      if (!license) {
        return ApiResponse.notFound(res, 'License not found');
      }

      await license.update({ status: 'active' });

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'activate_license',
        resourceType: 'license',
        resourceId: license.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, license.toJSON(), 'License activated successfully');
    } catch (error) {
      logger.error('Activate license error:', error);
      return ApiResponse.error(res, 'Failed to activate license');
    }
  }

  async getActiveLicenses(req, res) {
    try {
      const licenses = await License.findActive();
      return ApiResponse.success(res, licenses.map(l => l.toJSON()));
    } catch (error) {
      logger.error('Get active licenses error:', error);
      return ApiResponse.error(res, 'Failed to get active licenses');
    }
  }

  async getExpiredLicenses(req, res) {
    try {
      const licenses = await License.findExpired();
      return ApiResponse.success(res, licenses.map(l => l.toJSON()));
    } catch (error) {
      logger.error('Get expired licenses error:', error);
      return ApiResponse.error(res, 'Failed to get expired licenses');
    }
  }

  async getExpiringSoonLicenses(req, res) {
    try {
      const days = parseInt(req.query.days) || 7;
      const licenses = await License.findExpiringSoon(days);
      return ApiResponse.success(res, licenses.map(l => l.toJSON()));
    } catch (error) {
      logger.error('Get expiring soon licenses error:', error);
      return ApiResponse.error(res, 'Failed to get expiring soon licenses');
    }
  }
}

module.exports = new LicenseController();
