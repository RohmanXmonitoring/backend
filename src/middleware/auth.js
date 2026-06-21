// src/middleware/auth.js
const jwt = require('../config/jwt');
const User = require('../models/User');
const Session = require('../models/Session');

const auth = {
  async authenticate(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const decoded = jwt.verifyToken(token);
      
      // Check session
      const session = await Session.findByToken(token);
      if (!session || session.status !== 'active') {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired session'
        });
      }

      // Check if session is expired
      if (session.isExpired()) {
        await session.invalidate();
        return res.status(401).json({
          success: false,
          message: 'Session has expired'
        });
      }

      // Get user
      const user = await User.findById(decoded.userId);
      if (!user || user.status === 'deleted') {
        return res.status(401).json({
          success: false,
          message: 'User not found or inactive'
        });
      }

      // Update last activity
      await session.refreshActivity();
      
      // Store user and session in request
      req.user = user;
      req.session = session;
      req.token = token;

      next();
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  },

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verifyToken(token);
      const user = await User.findById(decoded.userId);
      
      if (!user || user.status === 'deleted') {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  }
};

module.exports = auth;
