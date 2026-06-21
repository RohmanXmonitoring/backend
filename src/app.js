// src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const http = require('http');

// Import configurations
const firebase = require('./config/firebase');
const redis = require('./config/redis');

// Import middleware
const auth = require('./middleware/auth');
const validator = require('./middleware/validator');
const RateLimiter = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const licenseRoutes = require('./routes/licenseRoutes');
const pinRoutes = require('./routes/pinRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Import logger
const logger = require('./utils/logger');

// Create Express app
const app = express();
const server = http.createServer(app);

// ===== MIDDLEWARE =====
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(compression());

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(validator.sanitizeXSS);
app.use(validator.sanitizeMongo);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
app.use('/api/auth', RateLimiter.create({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many authentication attempts'
}));

app.use('/api', RateLimiter.create({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests'
}));

// ===== ROUTES =====

// ROOT ROUTE
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Admin Backend API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV,
    endpoints: {
      api: '/api',
      health: '/health',
      docs: 'https://github.com/your-repo'
    },
    timestamp: new Date().toISOString()
  });
});

// API ROOT ROUTE - INI YANG DIMINTA
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Admin Backend API v1.0.0',
    version: '1.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        forgotPassword: 'POST /api/auth/forgot-password',
        resetPassword: 'POST /api/auth/reset-password',
        me: 'GET /api/auth/me'
      },
      users: {
        list: 'GET /api/users',
        create: 'POST /api/users',
        detail: 'GET /api/users/:id',
        update: 'PUT /api/users/:id',
        delete: 'DELETE /api/users/:id',
        suspend: 'POST /api/users/:id/suspend',
        activate: 'POST /api/users/:id/activate'
      },
      devices: {
        list: 'GET /api/devices',
        detail: 'GET /api/devices/:id',
        update: 'PUT /api/devices/:id',
        delete: 'DELETE /api/devices/:id',
        lostMode: 'POST /api/devices/:id/lost-mode'
      },
      licenses: {
        list: 'GET /api/licenses',
        create: 'POST /api/licenses',
        detail: 'GET /api/licenses/:id',
        update: 'PUT /api/licenses/:id',
        delete: 'DELETE /api/licenses/:id',
        extend: 'POST /api/licenses/:id/extend'
      },
      pins: {
        list: 'GET /api/pins',
        create: 'POST /api/pins',
        detail: 'GET /api/pins/:id',
        delete: 'DELETE /api/pins/:id',
        disable: 'POST /api/pins/:id/disable'
      },
      notifications: {
        list: 'GET /api/notifications',
        create: 'POST /api/notifications',
        detail: 'GET /api/notifications/:id',
        delete: 'DELETE /api/notifications/:id',
        broadcast: 'POST /api/notifications/broadcast'
      },
      dashboard: {
        stats: 'GET /api/dashboard/stats',
        statistics: 'GET /api/dashboard/statistics',
        recent: 'GET /api/dashboard/recent-activity'
      },
      system: {
        health: 'GET /health',
        info: 'GET /api/system-info',
        status: 'GET /api/status'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    server: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    firebase: firebase.isInitialized() ? 'connected' : 'disconnected',
    redis: redis.isConnected() ? 'connected' : 'disconnected'
  });
});

// API Status
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// System info
app.get('/api/system-info', (req, res) => {
  const os = require('os');
  res.json({
    success: true,
    data: {
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: process.uptime(),
      env: process.env.NODE_ENV,
      railway: !!process.env.RAILWAY_STATIC_URL
    },
    timestamp: new Date().toISOString()
  });
});

// ===== API ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/users', auth.authenticate, userRoutes);
app.use('/api/devices', auth.authenticate, deviceRoutes);
app.use('/api/licenses', auth.authenticate, licenseRoutes);
app.use('/api/pins', auth.authenticate, pinRoutes);
app.use('/api/notifications', auth.authenticate, notificationRoutes);
app.use('/api/dashboard', auth.authenticate, dashboardRoutes);

// ===== 404 HANDLER =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: {
      root: 'GET /',
      api: 'GET /api',
      health: 'GET /health',
      status: 'GET /api/status',
      system: 'GET /api/system-info',
      auth: 'POST /api/auth/login',
      users: 'GET /api/users',
      devices: 'GET /api/devices',
      licenses: 'GET /api/licenses',
      pins: 'GET /api/pins',
      notifications: 'GET /api/notifications',
      dashboard: 'GET /api/dashboard/stats'
    },
    timestamp: new Date().toISOString()
  });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  
  const statusCode = err.status || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`📍 Base URL: http://${HOST}:${PORT}`);
  console.log(`📋 API Docs: http://${HOST}:${PORT}/api`);
});

module.exports = { app, server };
