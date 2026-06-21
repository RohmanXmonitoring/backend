const { body, param, query } = require('express-validator');

const validateDevice = [
  body('deviceName')
    .notEmpty()
    .withMessage('Device name is required'),
  body('deviceId')
    .notEmpty()
    .withMessage('Device ID is required'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
];

const validateDeviceUpdate = [
  body('deviceName')
    .optional()
    .notEmpty()
    .withMessage('Device name cannot be empty'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'lost', 'deleted'])
    .withMessage('Invalid status'),
  body('lostMode')
    .optional()
    .isBoolean()
    .withMessage('Lost mode must be boolean')
];

const validateDeviceId = [
  param('id')
    .notEmpty()
    .withMessage('Device ID is required')
];

const validateDeviceStatus = [
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'lost'])
    .withMessage('Invalid status')
];

module.exports = {
  validateDevice,
  validateDeviceUpdate,
  validateDeviceId,
  validateDeviceStatus
};
