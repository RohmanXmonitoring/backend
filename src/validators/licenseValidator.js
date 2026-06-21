const { body, param, query } = require('express-validator');

const validateLicense = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('type')
    .notEmpty()
    .withMessage('License type is required')
    .isIn(['reseller_1year', 'user_30days', 'user_1year'])
    .withMessage('Invalid license type')
];

const validateLicenseUpdate = [
  body('status')
    .optional()
    .isIn(['active', 'expired', 'disabled', 'deleted'])
    .withMessage('Invalid status')
];

const validateLicenseId = [
  param('id')
    .notEmpty()
    .withMessage('License ID is required')
];

const validateExtendLicense = [
  body('days')
    .notEmpty()
    .withMessage('Days is required')
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
];

module.exports = {
  validateLicense,
  validateLicenseUpdate,
  validateLicenseId,
  validateExtendLicense
};
