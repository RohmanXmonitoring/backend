// src/controllers/authController.js
const User = require('../models/User');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const jwt = require('../config/jwt');
const redis = require('../config/redis');
const Encryption = require('../utils/encryption');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const { AUDIT_ACTIONS } = require('../utils/constants');

class AuthController {
  // ===== REGISTER =====
  async register(req, res) {
    try {
      const { email, username, password, fullName } = req.body;

      // Validate input
      if (!email || !username || !password || !fullName) {
        return ApiResponse.badRequest(res, 'All fields are required');
      }

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
        role: 'user',
        status: 'active',
        licenseType: 'none'
      });

      // Log audit
      await AuditLog.create({
        userId: user.id,
        userEmail: user.email,
        action: 'register',
        resourceType: 'user',
        resourceId: user.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { registration: 'new_user' }
      });

      // Emit socket event
      if (global.io) {
        global.io.emit('user_registered', {
          userId: user.id,
          email: user.email,
          timestamp: new Date().toISOString()
        });
      }

      return ApiResponse.created(res, {
        user: user.toJSON(),
        message: 'Registration successful. Please login.'
      }, 'Registration successful');

    } catch (error) {
      logger.error('Register error:', error);
      return ApiResponse.error(res, 'Registration failed: ' + error.message);
    }
  }

  // ===== LOGIN =====
  async login(req, res) {
    try {
      const { email, password, rememberMe = false } = req.body;

      // Validate input
      if (!email || !password) {
        return ApiResponse.badRequest(res, 'Email and password are required');
      }

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return ApiResponse.unauthorized(res, 'Invalid credentials');
      }

      // Check user status
      if (user.status === 'suspended') {
        return ApiResponse.forbidden(res, 'Account has been suspended');
      }
      if (user.status === 'deleted') {
        return ApiResponse.unauthorized(res, 'Account not found');
      }

      // Verify password
      const isValidPassword = await Encryption.comparePassword(password, user.password);
      if (!isValidPassword) {
        await AuditLog.create({
          userId: user.id,
          userEmail: user.email,
          action: AUDIT_ACTIONS.LOGIN,
          status: 'failed',
          details: { reason: 'Invalid password' },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
        return ApiResponse.unauthorized(res, 'Invalid credentials');
      }

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role
      };

      const token = jwt.generateToken(tokenPayload);
      const refreshToken = jwt.generateRefreshToken(tokenPayload);
      const expiresIn = rememberMe ? '7d' : '15m';

      // Create session
      const session = await Session.create({
        userId: user.id,
        token,
        refreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceInfo: {
          userAgent: req.headers['user-agent'],
          ip: req.ip
        },
        expiresAt: new Date(Date.now() + (rememberMe ? 7 : 1) * 24 * 60 * 60 * 1000)
      });

      // Store in Redis (dengan pengecekan aman)
      if (redis && redis.isConnected && redis.isConnected()) {
        try {
          await redis.setUserSession(user.id, {
            sessionId: session.id,
            token,
            refreshToken,
            expiresAt: session.expiresAt
          });
        } catch (redisError) {
          logger.warn('Redis store failed:', redisError.message);
        }
      }

      // Update user last login
      await user.update({ lastLogin: new Date() });

      // Log audit
      await AuditLog.create({
        userId: user.id,
        userEmail: user.email,
        action: AUDIT_ACTIONS.LOGIN,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { rememberMe }
      });

      // Emit socket event
      if (global.io) {
        global.io.emit('user_login', {
          userId: user.id,
          email: user.email,
          timestamp: new Date().toISOString()
        });
      }

      return ApiResponse.success(res, {
        user: user.toJSON(),
        token,
        refreshToken,
        expiresIn
      }, 'Login successful');

    } catch (error) {
      logger.error('Login error:', error);
      return ApiResponse.error(res, 'Login failed: ' + error.message);
    }
  }

  // ===== REFRESH TOKEN =====
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return ApiResponse.badRequest(res, 'Refresh token required');
      }

      // Verify refresh token
      const decoded = jwt.verifyRefreshToken(refreshToken);
      
      // Find session
      const session = await Session.findByToken(refreshToken);
      if (!session || session.status !== 'active') {
        return ApiResponse.unauthorized(res, 'Invalid refresh token');
      }

      // Get user
      const user = await User.findById(decoded.userId);
      if (!user || user.status === 'deleted') {
        return ApiResponse.unauthorized(res, 'User not found');
      }

      // Generate new tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role
      };

      const newToken = jwt.generateToken(tokenPayload);
      const newRefreshToken = jwt.generateRefreshToken(tokenPayload);

      // Update session
      await session.update({
        token: newToken,
        refreshToken: newRefreshToken,
        lastActivity: new Date()
      });

      // Update Redis (dengan pengecekan aman)
      if (redis && redis.isConnected && redis.isConnected()) {
        try {
          await redis.setUserSession(user.id, {
            sessionId: session.id,
            token: newToken,
            refreshToken: newRefreshToken,
            expiresAt: session.expiresAt
          });
        } catch (redisError) {
          logger.warn('Redis update failed:', redisError.message);
        }
      }

      return ApiResponse.success(res, {
        token: newToken,
        refreshToken: newRefreshToken
      }, 'Token refreshed');

    } catch (error) {
      logger.error('Refresh token error:', error);
      return ApiResponse.unauthorized(res, 'Invalid refresh token');
    }
  }

  // ===== LOGOUT =====
  async logout(req, res) {
    try {
      const userId = req.user.id;
      const token = req.token;

      // Invalidate session
      if (req.session) {
        await req.session.invalidate();
      }

      // Blacklist token in Redis (dengan pengecekan aman)
      if (redis && redis.isConnected && redis.isConnected()) {
        try {
          const ttl = Math.floor((req.session?.expiresAt - Date.now()) / 1000) || 3600;
          await redis.setCache(`blacklist:${token}`, 'true', ttl);
          await redis.deleteUserSession(userId);
          await redis.setUserOffline(userId);
        } catch (redisError) {
          logger.warn('Redis blacklist failed:', redisError.message);
        }
      }

      // Log audit
      await AuditLog.create({
        userId,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.LOGOUT,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      // Emit socket event
      if (global.io) {
        global.io.emit('user_logout', {
          userId,
          timestamp: new Date().toISOString()
        });
      }

      return ApiResponse.success(res, null, 'Logout successful');

    } catch (error) {
      logger.error('Logout error:', error);
      return ApiResponse.error(res, 'Logout failed: ' + error.message);
    }
  }

  // ===== FORGOT PASSWORD =====
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return ApiResponse.badRequest(res, 'Email is required');
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return ApiResponse.success(res, null, 'If email exists, reset link will be sent');
      }

      // Generate reset token
      const resetToken = Encryption.generateRandomString(32);

      // Store reset token in Redis (dengan pengecekan aman)
      if (redis && redis.isConnected && redis.isConnected()) {
        try {
          await redis.setCache(`reset:${email}`, resetToken, 3600);
        } catch (redisError) {
          logger.warn('Redis store reset token failed:', redisError.message);
        }
      }

      // TODO: Send reset email
      // await emailService.sendResetPassword(email, resetToken);

      return ApiResponse.success(res, null, 'Password reset link sent to email');

    } catch (error) {
      logger.error('Forgot password error:', error);
      return ApiResponse.error(res, 'Failed to process request');
    }
  }

  // ===== RESET PASSWORD =====
  async resetPassword(req, res) {
    try {
      const { email, token, newPassword } = req.body;

      if (!email || !token || !newPassword) {
        return ApiResponse.badRequest(res, 'Email, token, and new password are required');
      }

      // Verify reset token
      let isValid = false;
      if (redis && redis.isConnected && redis.isConnected()) {
        try {
          const storedToken = await redis.getCache(`reset:${email}`);
          isValid = storedToken === token;
          if (isValid) {
            await redis.deleteCache(`reset:${email}`);
          }
        } catch (redisError) {
          logger.warn('Redis verify reset token failed:', redisError.message);
        }
      }

      if (!isValid) {
        return ApiResponse.badRequest(res, 'Invalid or expired reset token');
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      // Hash new password
      const hashedPassword = await Encryption.hashPassword(newPassword);
      await user.update({ password: hashedPassword });

      // Log audit
      await AuditLog.create({
        userId: user.id,
        userEmail: user.email,
        action: AUDIT_ACTIONS.RESET_PASSWORD,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, null, 'Password reset successful');

    } catch (error) {
      logger.error('Reset password error:', error);
      return ApiResponse.error(res, 'Failed to reset password');
    }
  }

  // ===== CHANGE PASSWORD =====
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = req.user;

      if (!currentPassword || !newPassword) {
        return ApiResponse.badRequest(res, 'Current password and new password are required');
      }

      // Verify current password
      const isValidPassword = await Encryption.comparePassword(currentPassword, user.password);
      if (!isValidPassword) {
        return ApiResponse.badRequest(res, 'Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await Encryption.hashPassword(newPassword);
      await user.update({ password: hashedPassword });

      // Log audit
      await AuditLog.create({
        userId: user.id,
        userEmail: user.email,
        action: 'change_password',
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, null, 'Password changed successfully');

    } catch (error) {
      logger.error('Change password error:', error);
      return ApiResponse.error(res, 'Failed to change password');
    }
  }

  // ===== VALIDATE TOKEN =====
  async validateToken(req, res) {
    try {
      const user = req.user;
      return ApiResponse.success(res, {
        user: user.toJSON(),
        valid: true
      }, 'Token is valid');
    } catch (error) {
      return ApiResponse.unauthorized(res, 'Invalid token');
    }
  }

  // ===== GET PROFILE =====
  async getProfile(req, res) {
    try {
      const user = req.user;
      return ApiResponse.success(res, user.toJSON(), 'Profile retrieved');
    } catch (error) {
      logger.error('Get profile error:', error);
      return ApiResponse.error(res, 'Failed to get profile');
    }
  }

  // ===== VERIFY EMAIL =====
  async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return ApiResponse.badRequest(res, 'Verification token is required');
      }

      // TODO: Implement email verification
      // const email = await verifyEmailToken(token);
      // const user = await User.findByEmail(email);
      // await user.update({ isEmailVerified: true });

      return ApiResponse.success(res, null, 'Email verified successfully');

    } catch (error) {
      logger.error('Verify email error:', error);
      return ApiResponse.error(res, 'Failed to verify email');
    }
  }
}

module.exports = new AuthController();
