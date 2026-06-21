const express = require('express');
const router = express.Router();
const pinController = require('../controllers/pinController');
const { validatePin, validatePinUpdate, validatePinId } = require('../validators/pinValidator');
const validator = require('../middleware/validator');
const role = require('../middleware/role');
const auth = require('../middleware/auth');

// Admin routes
router.get('/', role.isAdmin, validator.validatePagination, pinController.getAllPins);
router.get('/:id', role.isAdmin, validatePinId, validator.validate, pinController.getPinById);
router.post('/', role.isAdmin, validatePin, validator.validate, pinController.createPin);
router.put('/:id', role.isAdmin, validatePinId, validatePinUpdate, validator.validate, pinController.updatePin);
router.delete('/:id', role.isAdmin, validatePinId, validator.validate, pinController.deletePin);

// PIN management
router.post('/:id/disable', role.isAdmin, validatePinId, validator.validate, pinController.disablePin);
router.post('/:id/expire', role.isAdmin, validatePinId, validator.validate, pinController.expirePin);
router.post('/:id/use', role.isAdmin, validatePinId, validator.validate, pinController.usePin);

// PIN status
router.get('/status/active', role.isAdmin, pinController.getActivePins);
router.get('/status/used', role.isAdmin, pinController.getUsedPins);
router.get('/status/expired', role.isAdmin, pinController.getExpiredPins);

module.exports = router;
