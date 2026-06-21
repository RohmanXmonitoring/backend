const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateLogin, validateRefresh, validateForgotPassword } = require('../validators/authValidator');
const validator = require('../middleware/validator');
const auth = require('../middleware/auth');

// Public routes
router.post('/login', validateLogin, validator.validate, authController.login);
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
