const rateLimit = require('express-rate-limit');
const redis = require('../config/redis');

class RateLimiter {
  static create({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests' } = {}) {
    return rateLimit({
      windowMs,
      max,
      message: {
        success: false,
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/api/status';
      },
      keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise use IP
        return req.user?.id || req.ip;
      },
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
    });
  }

  static strict() {
    return RateLimiter.create({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 10,
      message: 'Too many requests, please slow down'
    });
  }

  static moderate() {
    return RateLimiter.create({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 50,
      message: 'Too many requests, please try again later'
    });
  }

  static relaxed() {
    return RateLimiter.create({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 200,
      message: 'Too many requests, please try again later'
    });
  }

  static async checkRedisLimit(key, limit = 100, window = 60) {
    if (!redis.isConnected()) {
      return { allowed: true, remaining: limit };
    }

    const current = await redis.getCache(`rate_limit:${key}`);
    const count = current ? parseInt(current) : 0;
    
    if (count >= limit) {
      const ttl = await redis.ttl(`rate_limit:${key}`);
      return { 
        allowed: false, 
        remaining: 0,
        retryAfter: ttl
      };
    }

    await redis.setCache(`rate_limit:${key}`, count + 1, window);
    return { allowed: true, remaining: limit - count - 1 };
  }

  static async reset(key) {
    if (redis.isConnected()) {
      await redis.deleteCache(`rate_limit:${key}`);
    }
  }
}

module.exports = RateLimiter;
