// src/controllers/invitationController.js
const Invitation = require('../models/Invitation');
const User = require('../models/User');
const Device = require('../models/Device');
const License = require('../models/License');
const AuditLog = require('../models/AuditLog');
const emailService = require('../services/emailService');
const Encryption = require('../utils/encryption');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const { AUDIT_ACTIONS } = require('../utils/constants');
const socketHandler = require('../sockets');

class InvitationController {
  // ===== SEND INVITATION =====
  async sendInvitation(req, res) {
    try {
      const {
        email,
        type = 'user',
        role = 'user',
        deviceLimit = 1,
        licenseType = 'user_30days',
        userData = {},
        expiryDays = 7
      } = req.body;

      // Validate email
      if (!email) {
        return ApiResponse.badRequest(res, 'Email is required');
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return ApiResponse.badRequest(res, 'User with this email already exists');
      }

      // Check if invitation already sent
      const existingInvitation = await Invitation.findByEmail(email);
      if (existingInvitation) {
        return ApiResponse.badRequest(res, 'Invitation already sent to this email');
      }

      // Calculate expiry date
      const expiredAt = new Date();
      expiredAt.setDate(expiredAt.getDate() + expiryDays);

      // Create invitation
      const invitation = await Invitation.create({
        email,
        type,
        role,
        deviceLimit,
        licenseType,
        userData: {
          fullName: userData.fullName || '',
          username: userData.username || '',
          ...userData
        },
        invitedBy: req.user.id,
        invitedByName: req.user.fullName || req.user.email,
        expiredAt,
        status: 'pending'
      });

      // Send email
      const frontendUrl = process.env.FRONTEND_URL || 'https://your-app.com';
      const emailSent = await emailService.sendInvitationEmail(invitation, frontendUrl);

      if (emailSent) {
        await invitation.send();
      }

      // Log audit
      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'send_invitation',
        resourceType: 'invitation',
        resourceId: invitation.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          invitedEmail: email,
          type,
          role
        }
      });

      // Emit socket event
      socketHandler.emitToAll('invitation_sent', {
        invitationId: invitation.id,
        email,
        invitedBy: req.user.id,
        timestamp: new Date().toISOString()
      });

      return ApiResponse.success(res, {
        invitation: invitation.toJSON(),
        emailSent
      }, 'Invitation sent successfully');

    } catch (error) {
      logger.error('Send invitation error:', error);
      return ApiResponse.error(res, 'Failed to send invitation: ' + error.message);
    }
  }

  // ===== ACCEPT INVITATION =====
  async acceptInvitation(req, res) {
    try {
      const { inviteCode } = req.params;
      const { password, fullName, username, deviceName } = req.body;

      if (!password) {
        return ApiResponse.badRequest(res, 'Password is required');
      }

      // Find invitation
      const invitation = await Invitation.findByInviteCode(inviteCode);
      if (!invitation) {
        return ApiResponse.badRequest(res, 'Invalid or expired invitation code');
      }

      // Check if expired
      if (invitation.isExpired()) {
        await invitation.expire();
        return ApiResponse.badRequest(res, 'Invitation has expired');
      }

      // Check if already accepted
      if (invitation.status === 'accepted') {
        return ApiResponse.badRequest(res, 'Invitation already accepted');
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(invitation.email);
      if (existingUser) {
        await invitation.cancel();
        return ApiResponse.badRequest(res, 'User already exists');
      }

      // Create user
      const hashedPassword = await Encryption.hashPassword(password);
      const user = await User.create({
        email: invitation.email,
        username: username || invitation.email.split('@')[0],
        password: hashedPassword,
        fullName: fullName || invitation.userData.fullName || invitation.email.split('@')[0],
        role: invitation.role,
        status: 'active',
        licenseType: invitation.licenseType,
        isEmailVerified: true
      });

      // Create license
      const licenseKey = Encryption.generateLicenseKey();
      const licenseExpiry = new Date();
      const durations = {
        'user_30days': 30,
        'user_1year': 365,
        'reseller_1year': 365
      };
      const duration = durations[invitation.licenseType] || 30;
      licenseExpiry.setDate(licenseExpiry.getDate() + duration);

      const license = await License.create({
        licenseKey,
        type: invitation.licenseType,
        userId: user.id,
        status: 'active',
        issuedAt: new Date(),
        expiredAt: licenseExpiry
      });

      // Create device if deviceName provided
      if (deviceName) {
        await Device.create({
          deviceName,
          userId: user.id,
          status: 'active'
        });
      }

      // Update invitation
      await invitation.accept();

      // Log audit
      await AuditLog.create({
        userId: user.id,
        userEmail: user.email,
        action: 'accept_invitation',
        resourceType: 'invitation',
        resourceId: invitation.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          invitedBy: invitation.invitedBy,
          type: invitation.type
        }
      });

      // Emit socket event
      socketHandler.emitToAll('invitation_accepted', {
        invitationId: invitation.id,
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      });

      // Generate tokens for auto-login
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role
      };
      const token = jwt.generateToken(tokenPayload);
      const refreshToken = jwt.generateRefreshToken(tokenPayload);

      return ApiResponse.success(res, {
        user: user.toJSON(),
        license: license.toJSON(),
        token,
        refreshToken,
        invitation: invitation.toJSON()
      }, 'Invitation accepted successfully');

    } catch (error) {
      logger.error('Accept invitation error:', error);
      return ApiResponse.error(res, 'Failed to accept invitation: ' + error.message);
    }
  }

  // ===== RESEND INVITATION =====
  async resendInvitation(req, res) {
    try {
      const { id } = req.params;

      const invitation = await Invitation.findById(id);
      if (!invitation) {
        return ApiResponse.notFound(res, 'Invitation not found');
      }

      if (invitation.status === 'accepted') {
        return ApiResponse.badRequest(res, 'Invitation already accepted');
      }

      if (invitation.status === 'expired') {
        // Extend expiry
        const expiredAt = new Date();
        expiredAt.setDate(expiredAt.getDate() + 7);
        await invitation.update({
          expiredAt,
          status: 'pending'
        });
      }

      // Resend email
      const frontendUrl = process.env.FRONTEND_URL || 'https://your-app.com';
      const emailSent = await emailService.sendInvitationEmail(invitation, frontendUrl);

      if (emailSent) {
        await invitation.send();
      }

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'resend_invitation',
        resourceType: 'invitation',
        resourceId: invitation.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, {
        invitation: invitation.toJSON(),
        emailSent
      }, 'Invitation resent successfully');

    } catch (error) {
      logger.error('Resend invitation error:', error);
      return ApiResponse.error(res, 'Failed to resend invitation');
    }
  }

  // ===== CANCEL INVITATION =====
  async cancelInvitation(req, res) {
    try {
      const { id } = req.params;

      const invitation = await Invitation.findById(id);
      if (!invitation) {
        return ApiResponse.notFound(res, 'Invitation not found');
      }

      if (invitation.status === 'accepted') {
        return ApiResponse.badRequest(res, 'Cannot cancel accepted invitation');
      }

      await invitation.cancel();

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'cancel_invitation',
        resourceType: 'invitation',
        resourceId: invitation.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, null, 'Invitation cancelled successfully');

    } catch (error) {
      logger.error('Cancel invitation error:', error);
      return ApiResponse.error(res, 'Failed to cancel invitation');
    }
  }

  // ===== GET INVITATIONS =====
  async getInvitations(req, res) {
    try {
      const { status, type, email } = req.query;
      const { page, limit, sort, order } = req.pagination;

      const filters = {};
      if (status) filters.status = status;
      if (type) filters.type = type;
      if (email) filters.email = email;

      const invitations = await Invitation.findAll(filters, {
        limit,
        skip: (page - 1) * limit,
        sort: sort || 'createdAt',
        order: order || 'desc'
      });

      const total = await Invitation.count(filters);

      return ApiResponse.paginate(res,
        invitations.map(i => i.toJSON()),
        total,
        page,
        limit
      );
    } catch (error) {
      logger.error('Get invitations error:', error);
      return ApiResponse.error(res, 'Failed to get invitations');
    }
  }

  // ===== GET INVITATION BY ID =====
  async getInvitationById(req, res) {
    try {
      const { id } = req.params;

      const invitation = await Invitation.findById(id);
      if (!invitation) {
        return ApiResponse.notFound(res, 'Invitation not found');
      }

      return ApiResponse.success(res, invitation.toJSON());
    } catch (error) {
      logger.error('Get invitation error:', error);
      return ApiResponse.error(res, 'Failed to get invitation');
    }
  }

  // ===== GET INVITATION STATS =====
  async getInvitationStats(req, res) {
    try {
      const total = await Invitation.findAll({});
      const pending = await Invitation.findAll({ status: 'pending' });
      const sent = await Invitation.findAll({ status: 'sent' });
      const accepted = await Invitation.findAll({ status: 'accepted' });
      const expired = await Invitation.findAll({ status: 'expired' });

      return ApiResponse.success(res, {
        total: total.length,
        pending: pending.length,
        sent: sent.length,
        accepted: accepted.length,
        expired: expired.length,
        acceptanceRate: total.length > 0 ? (accepted.length / total.length * 100).toFixed(2) : 0
      });
    } catch (error) {
      logger.error('Get invitation stats error:', error);
      return ApiResponse.error(res, 'Failed to get invitation stats');
    }
  }

  // ===== CHECK INVITATION VALIDITY =====
  async checkInvitation(req, res) {
    try {
      const { inviteCode } = req.params;

      const invitation = await Invitation.findByInviteCode(inviteCode);
      if (!invitation) {
        return ApiResponse.success(res, {
          valid: false,
          message: 'Invalid invitation code'
        });
      }

      if (invitation.isExpired()) {
        return ApiResponse.success(res, {
          valid: false,
          message: 'Invitation has expired',
          expiredAt: invitation.expiredAt
        });
      }

      if (invitation.status === 'accepted') {
        return ApiResponse.success(res, {
          valid: false,
          message: 'Invitation already accepted'
        });
      }

      return ApiResponse.success(res, {
        valid: true,
        invitation: {
          email: invitation.email,
          type: invitation.type,
          role: invitation.role,
          invitedBy: invitation.invitedByName,
          deviceLimit: invitation.deviceLimit,
          licenseType: invitation.licenseType,
          expiredAt: invitation.expiredAt,
          daysRemaining: invitation.getDaysRemaining()
        }
      });

    } catch (error) {
      logger.error('Check invitation error:', error);
      return ApiResponse.error(res, 'Failed to check invitation');
    }
  }

  // ===== BULK SEND INVITATIONS =====
  async bulkSendInvitations(req, res) {
    try {
      const { invitations: invitationDataList } = req.body;

      if (!Array.isArray(invitationDataList) || invitationDataList.length === 0) {
        return ApiResponse.badRequest(res, 'Invitations list is required');
      }

      if (invitationDataList.length > 50) {
        return ApiResponse.badRequest(res, 'Maximum 50 invitations per batch');
      }

      const results = {
        success: [],
        failed: []
      };

      for (const data of invitationDataList) {
        try {
          const {
            email,
            type = 'user',
            role = 'user',
            deviceLimit = 1,
            licenseType = 'user_30days',
            userData = {}
          } = data;

          // Check if user exists
          const existingUser = await User.findByEmail(email);
          if (existingUser) {
            results.failed.push({ email, reason: 'User already exists' });
            continue;
          }

          // Check if invitation exists
          const existingInvitation = await Invitation.findByEmail(email);
          if (existingInvitation) {
            results.failed.push({ email, reason: 'Invitation already sent' });
            continue;
          }

          // Create invitation
          const expiredAt = new Date();
          expiredAt.setDate(expiredAt.getDate() + 7);

          const invitation = await Invitation.create({
            email,
            type,
            role,
            deviceLimit,
            licenseType,
            userData,
            invitedBy: req.user.id,
            invitedByName: req.user.fullName || req.user.email,
            expiredAt,
            status: 'pending'
          });

          // Send email
          const frontendUrl = process.env.FRONTEND_URL || 'https://your-app.com';
          const emailSent = await emailService.sendInvitationEmail(invitation, frontendUrl);

          if (emailSent) {
            await invitation.send();
          }

          results.success.push({
            email,
            invitationId: invitation.id,
            emailSent
          });

        } catch (error) {
          results.failed.push({ email: data.email, reason: error.message });
        }
      }

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'bulk_send_invitations',
        resourceType: 'invitation',
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          total: invitationDataList.length,
          success: results.success.length,
          failed: results.failed.length
        }
      });

      return ApiResponse.success(res, results, 'Bulk invitations processed');

    } catch (error) {
      logger.error('Bulk send invitations error:', error);
      return ApiResponse.error(res, 'Failed to send bulk invitations');
    }
  }
}

module.exports = new InvitationController();
