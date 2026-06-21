const User = require('../models/User');
const Device = require('../models/Device');
const License = require('../models/License');
const AuditLog = require('../models/AuditLog');
const Encryption = require('../utils/encryption');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const { AUDIT_ACTIONS } = require('../utils/constants');
const socketHandler = require('../sockets');

class UserController {
  async getAllUsers(req, res) {
    try {
      const { search, role, status } = req.query;
      const { page, limit, sort, order } = req.pagination;

      const filters = {};
      if (role) filters.role = role;
      if (status) filters.status = status;
      if (search) filters.search = search;

      const users = await User.findAll(filters, {
        limit,
        skip: (page - 1) * limit,
        sort,
        order
      });

      // Get total count
      const total = await User.count(filters);

      return ApiResponse.paginate(res, 
        users.map(u => u.toJSON()),
        total,
        page,
        limit
      );
    } catch (error) {
      logger.error('Get all users error:', error);
      return ApiResponse.error(res, 'Failed to get users');
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);

      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      return ApiResponse.success(res, user.toJSON());
    } catch (error) {
      logger.error('Get user by id error:', error);
      return ApiResponse.error(res, 'Failed to get user');
    }
  }

  async createUser(req, res) {
    try {
      const { email, username, password, fullName, role, licenseType } = req.body;

      // Check if email exists
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return ApiResponse.badRequest(res, 'Email already exists');
      }

      // Check if username exists
      const existingUsername = await User.findByUsername(username);
      if (existingUsername) {
        return ApiResponse.badRequest(res, 'Username already exists');
      }

      // Hash password
      const hashedPassword = await Encryption.hashPassword(password);

      // Create user
      const user = await User.create({
        email,
        username,
        password: hashedPassword,
        fullName,
        role: role || 'user',
        licenseType: licenseType || 'none',
        status: 'active'
      });

      // Create license if specified
      if (licenseType && licenseType !== 'none') {
        const licenseKey = Encryption.generateLicenseKey();
        const license = await License.create({
          licenseKey,
          type: licenseType,
          userId: user.id,
          status: 'active',
          issuedAt: new Date(),
          expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });
      }

      // Log audit
      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.CREATE_USER,
        resourceType: 'user',
        resourceId: user.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { createdUser: user.email }
      });

      // Emit socket event
      socketHandler.emitUserCreated(user);

      return ApiResponse.created(res, user.toJSON(), 'User created successfully');
    } catch (error) {
      logger.error('Create user error:', error);
      return ApiResponse.error(res, 'Failed to create user');
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { fullName, email, username, status, licenseType } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      // Check email conflict
      if (email && email !== user.email) {
        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
          return ApiResponse.badRequest(res, 'Email already exists');
        }
      }

      // Check username conflict
      if (username && username !== user.username) {
        const existingUsername = await User.findByUsername(username);
        if (existingUsername) {
          return ApiResponse.badRequest(res, 'Username already exists');
        }
      }

      await user.update({
        fullName: fullName || user.fullName,
        email: email || user.email,
        username: username || user.username,
        status: status || user.status,
        licenseType: licenseType || user.licenseType
      });

      // Log audit
      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.UPDATE_USER,
        resourceType: 'user',
        resourceId: user.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { updatedFields: Object.keys(req.body) }
      });

      // Emit socket event
      socketHandler.emitUserUpdated(user);

      return ApiResponse.success(res, user.toJSON(), 'User updated successfully');
    } catch (error) {
      logger.error('Update user error:', error);
      return ApiResponse.error(res, 'Failed to update user');
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      await user.delete();

      // Log audit
      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.DELETE_USER,
        resourceType: 'user',
        resourceId: user.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      // Emit socket event
      socketHandler.emitUserDeleted(id);

      return ApiResponse.success(res, null, 'User deleted successfully');
    } catch (error) {
      logger.error('Delete user error:', error);
      return ApiResponse.error(res, 'Failed to delete user');
    }
  }

  async suspendUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      if (user.role === 'super_admin') {
        return ApiResponse.badRequest(res, 'Cannot suspend super admin');
      }

      await user.update({ status: 'suspended' });

      // Log audit
      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.SUSPEND_USER,
        resourceType: 'user',
        resourceId: user.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, user.toJSON(), 'User suspended successfully');
    } catch (error) {
      logger.error('Suspend user error:', error);
      return ApiResponse.error(res, 'Failed to suspend user');
    }
  }

  async activateUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      await user.update({ status: 'active' });

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'activate_user',
        resourceType: 'user',
        resourceId: user.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, user.toJSON(), 'User activated successfully');
    } catch (error) {
      logger.error('Activate user error:', error);
      return ApiResponse.error(res, 'Failed to activate user');
    }
  }

  async resetUserPassword(req, res) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      const hashedPassword = await Encryption.hashPassword(newPassword);
      await user.update({ password: hashedPassword });

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.RESET_PASSWORD,
        resourceType: 'user',
        resourceId: user.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, null, 'Password reset successfully');
    } catch (error) {
      logger.error('Reset user password error:', error);
      return ApiResponse.error(res, 'Failed to reset password');
    }
  }

  async assignRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      await user.update({ role });

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.ASSIGN_ROLE,
        resourceType: 'user',
        resourceId: user.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { newRole: role }
      });

      return ApiResponse.success(res, user.toJSON(), 'Role assigned successfully');
    } catch (error) {
      logger.error('Assign role error:', error);
      return ApiResponse.error(res, 'Failed to assign role');
    }
  }

  async extendLicense(req, res) {
    try {
      const { id } = req.params;
      const { days } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      // Find user's license
      const licenses = await License.findAll({ userId: user.id });
      const activeLicense = licenses.find(l => l.status === 'active');

      if (!activeLicense) {
        return ApiResponse.notFound(res, 'No active license found');
      }

      await activeLicense.extend(days);

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.EXTEND_LICENSE,
        resourceType: 'license',
        resourceId: activeLicense.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { extendedDays: days }
      });

      return ApiResponse.success(res, user.toJSON(), 'License extended successfully');
    } catch (error) {
      logger.error('Extend license error:', error);
      return ApiResponse.error(res, 'Failed to extend license');
    }
  }

  async getUserDevices(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      const devices = await Device.findAll({ userId: user.id });

      return ApiResponse.success(res, devices.map(d => d.toJSON()));
    } catch (error) {
      logger.error('Get user devices error:', error);
      return ApiResponse.error(res, 'Failed to get user devices');
    }
  }

  async getProfile(req, res) {
    try {
      const user = req.user;
      return ApiResponse.success(res, user.toJSON());
    } catch (error) {
      logger.error('Get profile error:', error);
      return ApiResponse.error(res, 'Failed to get profile');
    }
  }

  async updateProfile(req, res) {
    try {
      const user = req.user;
      const { fullName, email, username } = req.body;

      if (email && email !== user.email) {
        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
          return ApiResponse.badRequest(res, 'Email already exists');
        }
      }

      if (username && username !== user.username) {
        const existingUsername = await User.findByUsername(username);
        if (existingUsername) {
          return ApiResponse.badRequest(res, 'Username already exists');
        }
      }

      await user.update({
        fullName: fullName || user.fullName,
        email: email || user.email,
        username: username || user.username
      });

      return ApiResponse.success(res, user.toJSON(), 'Profile updated successfully');
    } catch (error) {
      logger.error('Update profile error:', error);
      return ApiResponse.error(res, 'Failed to update profile');
    }
  }
}

module.exports = new UserController();
