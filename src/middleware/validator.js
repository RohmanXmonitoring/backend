// src/middleware/validator.js
const { validationResult } = require('express-validator');
const xss = require('xss');

const validator = {
  validate(validations) {
    return async (req, res, next) => {
      await Promise.all(validations.map(validation => validation.run(req)));

      const errors = validationResult(req);
      if (errors.isEmpty()) {
        return next();
      }

      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
          value: err.value
        }))
      });
    };
  },

  sanitizeXSS(req, res, next) {
    const sanitizeObject = (obj) => {
      if (typeof obj === 'string') {
        return xss(obj);
      }
      if (typeof obj === 'object' && obj !== null) {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    };

    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);
    next();
  },

  // HAPUS sanitizeMongo karena kita pakai Firebase
  // Ganti dengan sanitize sederhana
  sanitizeInput(req, res, next) {
    const sanitizeObject = (obj) => {
      if (typeof obj === 'string') {
        return obj.replace(/[^\w\s\-.,@]/g, '');
      }
      if (typeof obj === 'object' && obj !== null) {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    };

    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);
    next();
  },

  validatePagination(req, res, next) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || 'createdAt';
    const order = req.query.order || 'desc';

    req.pagination = {
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
      sort,
      order: order.toLowerCase() === 'asc' ? 'asc' : 'desc',
      skip: (page - 1) * limit
    };

    next();
  }
};

module.exports = validator;
