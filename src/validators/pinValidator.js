const { body, param, query } = require('express-validator');

const validatePin = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('deviceLimit')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Device limit must be between 1 and 10'),
  body('expiredDays')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Expiry days must be between 1 and 30')
];

const validatePinUpdate = [
  body('deviceLimit')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Device limit must be between 1 and 10'),
  body('status')
    .optional()
    .isIn(['active', 'used', 'expired', 'disabled', 'deleted'])
    .withMessage('Invalid status')
];

const validatePinId = [
  param('id')
    .notEmpty()
    .withMessage('PIN ID is required')
];

const validateUsePin = [
  body('deviceId')
    .notEmpty()
    .withMessage('Device ID is required')
];

module.exports = {
  validatePin,
  validatePinUpdate,
  validatePinId,
  validateUsePin
};
