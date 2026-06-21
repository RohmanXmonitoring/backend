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

// ===== ERROR HANDLING UNTUK STARTUP =====
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

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

// Sanitization sederhana
app.use((req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].replace(/[<>]/g, '');
      }
    });
  }
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== ROUTES =====

// ROOT ROUTE
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Admin Backend API Running',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// HEALTH CHECK
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    server: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: process.memoryUsage().rss,
      heapTotal: process.memoryUsage().heapTotal,
      heapUsed: process.memoryUsage().heapUsed
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    // Cek koneksi dengan aman
    firebase: firebase && firebase.isInitialized ? firebase.isInitialized() : false,
    redis: redis && redis.isConnected ? redis.isConnected() : false
  });
});

// API ROOT
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Admin Backend API v1.0.0',
    endpoints: {
      health: 'GET /health',
      auth: 'POST /api/auth/login',
      users: 'GET /api/users',
      devices: 'GET /api/devices'
    },
    timestamp: new Date().toISOString()
  });
});

// API STATUS
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
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
      health: 'GET /health',
      api: 'GET /api',
      status: 'GET /api/status'
    }
  });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.on('listening', () => {
  console.log(`✅ Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📍 Health check: http://${HOST}:${PORT}/health`);
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };
