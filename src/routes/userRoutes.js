const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { validateUser, validateUserUpdate, validateUserId } = require('../validators/userValidator');
const validator = require('../middleware/validator');
const role = require('../middleware/role');
const auth = require('../middleware/auth');

// Admin only routes
router.get('/', role.isAdmin, validator.validatePagination, userController.getAllUsers);
router.get('/:id', role.isAdmin, validateUserId, validator.validate, userController.getUserById);
router.post('/', role.isAdmin, validateUser, validator.validate, userController.createUser);
router.put('/:id', role.isAdmin, validateUserId, validateUserUpdate, validator.validate, userController.updateUser);
router.delete('/:id', role.isAdmin, validateUserId, validator.validate, userController.deleteUser);

// User management
router.post('/:id/suspend', role.isAdmin, validateUserId, validator.validate, userController.suspendUser);
router.post('/:id/activate', role.isAdmin, validateUserId, validator.validate, userController.activateUser);
router.post('/:id/reset-password', role.isAdmin, validateUserId, validator.validate, userController.resetUserPassword);
router.post('/:id/assign-role', role.isSuperAdmin, validateUserId, validator.validate, userController.assignRole);
router.post('/:id/extend-license', role.isAdmin, validateUserId, validator.validate, userController.extendLicense);

// User devices
router.get('/:id/devices', role.isAdmin, validateUserId, validator.validate, userController.getUserDevices);

// Own profile
router.get('/me', auth.authenticate, userController.getProfile);
router.put('/me', auth.authenticate, userController.updateProfile);

module.exports = router;
