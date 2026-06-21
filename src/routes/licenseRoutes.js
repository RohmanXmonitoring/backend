const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/licenseController');
const { validateLicense, validateLicenseUpdate, validateLicenseId } = require('../validators/licenseValidator');
const validator = require('../middleware/validator');
const role = require('../middleware/role');
const auth = require('../middleware/auth');

// Admin routes
router.get('/', role.isAdmin, validator.validatePagination, licenseController.getAllLicenses);
router.get('/:id', role.isAdmin, validateLicenseId, validator.validate, licenseController.getLicenseById);
router.post('/', role.isAdmin, validateLicense, validator.validate, licenseController.createLicense);
router.put('/:id', role.isAdmin, validateLicenseId, validateLicenseUpdate, validator.validate, licenseController.updateLicense);
router.delete('/:id', role.isAdmin, validateLicenseId, validator.validate, licenseController.deleteLicense);

// License management
router.post('/:id/extend', role.isAdmin, validateLicenseId, validator.validate, licenseController.extendLicense);
router.post('/:id/disable', role.isAdmin, validateLicenseId, validator.validate, licenseController.disableLicense);
router.post('/:id/activate', role.isAdmin, validateLicenseId, validator.validate, licenseController.activateLicense);

// License status
router.get('/status/active', role.isAdmin, licenseController.getActiveLicenses);
router.get('/status/expired', role.isAdmin, licenseController.getExpiredLicenses);
router.get('/status/expiring-soon', role.isAdmin, licenseController.getExpiringSoonLicenses);

module.exports = router;
