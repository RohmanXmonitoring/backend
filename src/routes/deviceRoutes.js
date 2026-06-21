const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { validateDevice, validateDeviceUpdate, validateDeviceId } = require('../validators/deviceValidator');
const validator = require('../middleware/validator');
const role = require('../middleware/role');
const auth = require('../middleware/auth');

// Admin routes
router.get('/', role.isAdmin, validator.validatePagination, deviceController.getAllDevices);
router.get('/:id', role.isAdmin, validateDeviceId, validator.validate, deviceController.getDeviceById);
router.put('/:id', role.isAdmin, validateDeviceId, validateDeviceUpdate, validator.validate, deviceController.updateDevice);
router.delete('/:id', role.isAdmin, validateDeviceId, validator.validate, deviceController.deleteDevice);

// Device management
router.post('/:id/rename', role.isAdmin, validateDeviceId, validator.validate, deviceController.renameDevice);
router.post('/:id/reset', role.isAdmin, validateDeviceId, validator.validate, deviceController.resetDevice);
router.post('/:id/lost-mode', role.isAdmin, validateDeviceId, validator.validate, deviceController.setLostMode);
router.post('/:id/disable-lost-mode', role.isAdmin, validateDeviceId, validator.validate, deviceController.disableLostMode);

// Device status
router.get('/status/online', role.isAdmin, deviceController.getOnlineDevices);
router.get('/status/offline', role.isAdmin, deviceController.getOfflineDevices);

module.exports = router;
