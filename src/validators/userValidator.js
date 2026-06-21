const { body, param, query } = require('express-validator');

const validateUser = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be 3-20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscore'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase, one lowercase, and one number'),
  body('fullName')
    .notEmpty()
    .withMessage('Full name is required'),
  body('role')
    .optional()
    .isIn(['super_admin', 'admin', 'reseller', 'user'])
    .withMessage('Invalid role'),
  body('licenseType')
    .optional()
    .isIn(['none', 'reseller_1year', 'user_30days', 'user_1year'])
    .withMessage('Invalid license type')
];

const validateUserUpdate = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('username')
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be 3-20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscore'),
  body('fullName')
    .optional()
    .notEmpty()
    .withMessage('Full name cannot be empty'),
  body('status')
    .optional()
    .isIn(['active', 'suspended', 'pending'])
    .withMessage('Invalid status'),
  body('role')
    .optional()
    .isIn(['super_admin', 'admin', 'reseller', 'user'])
    .withMessage('Invalid role'),
  body('licenseType')
    .optional()
    .isIn(['none', 'reseller_1year', 'user_30days', 'user_1year'])
    .withMessage('Invalid license type')
];

const validateUserId = [
  param('id')
    .notEmpty()
    .withMessage('User ID is required')
    .isLength({ min: 1 })
    .withMessage('Invalid user ID')
];

const validateUserSearch = [
  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a string'),
  query('role')
    .optional()
    .isIn(['super_admin', 'admin', 'reseller', 'user'])
    .withMessage('Invalid role'),
  query('status')
    .optional()
    .isIn(['active', 'suspended', 'pending', 'deleted'])
    .withMessage('Invalid status')
];

const validateAssignRole = [
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['super_admin', 'admin', 'reseller', 'user'])
    .withMessage('Invalid role')
];

const validateExtendLicense = [
  body('days')
    .notEmpty()
    .withMessage('Days is required')
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
];

module.exports = {
  validateUser,
  validateUserUpdate,
  validateUserId,
  validateUserSearch,
  validateAssignRole,
  validateExtendLicense
};
