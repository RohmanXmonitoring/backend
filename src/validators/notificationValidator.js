const { body, param, query } = require('express-validator');

const validateNotification = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 100 })
    .withMessage('Title must be less than 100 characters'),
  body('body')
    .notEmpty()
    .withMessage('Body is required')
    .isLength({ max: 500 })
    .withMessage('Body must be less than 500 characters'),
  body('type')
    .optional()
    .isIn(['broadcast', 'user', 'role', 'device', 'system'])
    .withMessage('Invalid notification type'),
  body('priority')
    .optional()
    .isIn(['high', 'normal', 'low'])
    .withMessage('Invalid priority'),
  body('userId')
    .optional()
    .isString()
    .withMessage('User ID must be a string'),
  body('role')
    .optional()
    .isIn(['super_admin', 'admin', 'reseller', 'user'])
    .withMessage('Invalid role')
];

const validateNotificationId = [
  param('id')
    .notEmpty()
    .withMessage('Notification ID is required')
];

const validateBroadcast = [
  body('title')
    .notEmpty()
    .withMessage('Title is required'),
  body('body')
    .notEmpty()
    .withMessage('Body is required'),
  body('priority')
    .optional()
    .isIn(['high', 'normal', 'low'])
    .withMessage('Invalid priority')
];

module.exports = {
  validateNotification,
  validateNotificationId,
  validateBroadcast
};
