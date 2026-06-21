const logger = require('../utils/logger');

const errorHandler = {
  handleError(err, req, res, next) {
    // Log error
    logger.error({
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id
    });

    // Handle specific error types
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: err.errors
      });
    }

    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized access'
      });
    }

    if (err.name === 'ForbiddenError') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden access'
      });
    }

    if (err.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    if (err.code === 'ERR_RATE_LIMIT') {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded'
      });
    }

    // Default error response
    const statusCode = err.statusCode || 500;
    const message = statusCode === 500 
      ? 'Internal server error' 
      : err.message || 'An error occurred';

    res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  },

  notFound(req, res) {
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.path} not found`
    });
  },

  async handleUncaughtException(err) {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
  },

  async handleUnhandledRejection(err) {
    logger.error('Unhandled Rejection:', err);
    process.exit(1);
  }
};

module.exports = errorHandler;
