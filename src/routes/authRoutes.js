// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateLogin, validateRefresh, validateForgotPassword } = require('../validators/authValidator');
const validator = require('../middleware/validator');
const auth = require('../middleware/auth');

// ===== INFO ROUTES (GET) =====
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Auth API Endpoints',
    endpoints: {
      login: {
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: 'string (required)',
          password: 'string (required)',
          rememberMe: 'boolean (optional)'
        }
      },
      register: {
        method: 'POST',
        url: '/api/auth/register',
        body: {
          email: 'string (required)',
          username: 'string (required)',
          password: 'string (required)',
          fullName: 'string (required)'
        }
      },
      refresh: {
        method: 'POST',
        url: '/api/auth/refresh',
        body: {
          refreshToken: 'string (required)'
        }
      },
      logout: {
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          Authorization: 'Bearer token'
        }
      },
      forgotPassword: {
        method: 'POST',
        url: '/api/auth/forgot-password',
        body: {
          email: 'string (required)'
        }
      },
      resetPassword: {
        method: 'POST',
        url: '/api/auth/reset-password',
        body: {
          email: 'string (required)',
          token: 'string (required)',
          newPassword: 'string (required)'
        }
      },
      me: {
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          Authorization: 'Bearer token'
        }
      }
    },
    timestamp: new Date().toISOString()
  });
});

router.get('/login', (req, res) => {
  res.json({
    success: true,
    message: 'Login endpoint - Use POST method',
    method: 'POST',
    url: '/api/auth/login',
    body: {
      email: 'your-email@example.com',
      password: 'your-password'
    },
    example: {
      email: 'admin@example.com',
      password: 'password123'
    }
  });
});

router.get('/register', (req, res) => {
  res.json({
    success: true,
    message: 'Register endpoint - Use POST method',
    method: 'POST',
    url: '/api/auth/register',
    body: {
      email: 'your-email@example.com',
      username: 'your-username',
      password: 'your-password',
      fullName: 'Your Full Name'
    }
  });
});

// ===== ACTUAL ROUTES (POST) =====
router.post('/login', validateLogin, validator.validate, authController.login);
router.post('/register', authController.register);
router.post('/refresh', validateRefresh, validator.validate, authController.refreshToken);
router.post('/forgot-password', validateForgotPassword, validator.validate, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);

// Protected routes
router.post('/logout', auth.authenticate, authController.logout);
router.post('/change-password', auth.authenticate, authController.changePassword);
router.post('/validate-token', auth.authenticate, authController.validateToken);
router.get('/me', auth.authenticate, authController.getProfile);

module.exports = router;
