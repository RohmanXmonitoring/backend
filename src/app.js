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
const role = require('./middleware/role');
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

// ===== ROUTES BARU =====
const screenShareRoutes = require('./routes/screenShareRoutes');
const screenRecordingRoutes = require('./routes/screenRecordingRoutes');
const appMonitoringRoutes = require('./routes/appMonitoringRoutes');
const messageRoutes = require('./routes/messageRoutes');
const invitationRoutes = require('./routes/invitationRoutes');

// Import socket handlers
const socketHandler = require('./sockets');

// Import jobs
const invitationJob = require('./jobs/invitationJob');

// Import logger
const logger = require('./utils/logger');

// Create Express app
const app = express();
const server = http.createServer(app);

// ===== SOCKET.IO SETUP =====
const socketIO = require('socket.io');
const io = socketIO(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN?.split(',') || ['*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io/',
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Store io instance globally
global.io = io;

// ===== ERROR HANDLING UNTUK STARTUP =====
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
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
    message: 'Admin Backend API Running',
    version: '1.0.0',
    status: 'online',
    environment: process.env.NODE_ENV || 'production',
    endpoints: {
      api: '/api',
      health: '/health',
      status: '/api/status',
      docs: '/api'
    },
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
    firebase: firebase && firebase.isInitialized ? firebase.isInitialized() : false,
    redis: redis && redis.isConnected ? redis.isConnected() : false
  });
});

// API ROOT - DENGAN SEMUA ENDPOINT
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Admin Backend API v1.0.0',
    version: '1.0.0',
    endpoints: {
      system: {
        health: 'GET /health',
        status: 'GET /api/status',
        info: 'GET /api/system-info'
      },
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        forgotPassword: 'POST /api/auth/forgot-password',
        resetPassword: 'POST /api/auth/reset-password',
        me: 'GET /api/auth/me',
        profile: 'GET /api/auth/profile'
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
        lostMode: 'POST /api/devices/:id/lost-mode',
        online: 'GET /api/devices/status/online',
        offline: 'GET /api/devices/status/offline'
      },
      licenses: {
        list: 'GET /api/licenses',
        create: 'POST /api/licenses',
        detail: 'GET /api/licenses/:id',
        update: 'PUT /api/licenses/:id',
        delete: 'DELETE /api/licenses/:id',
        extend: 'POST /api/licenses/:id/extend',
        active: 'GET /api/licenses/status/active',
        expired: 'GET /api/licenses/status/expired'
      },
      pins: {
        list: 'GET /api/pins',
        create: 'POST /api/pins',
        detail: 'GET /api/pins/:id',
        delete: 'DELETE /api/pins/:id',
        disable: 'POST /api/pins/:id/disable',
        expire: 'POST /api/pins/:id/expire',
        active: 'GET /api/pins/status/active'
      },
      notifications: {
        list: 'GET /api/notifications',
        create: 'POST /api/notifications',
        detail: 'GET /api/notifications/:id',
        delete: 'DELETE /api/notifications/:id',
        send: 'POST /api/notifications/:id/send',
        broadcast: 'POST /api/notifications/broadcast',
        my: 'GET /api/notifications/user/me'
      },
      dashboard: {
        stats: 'GET /api/dashboard/stats',
        statistics: 'GET /api/dashboard/statistics',
        recent: 'GET /api/dashboard/recent-activity',
        charts: 'GET /api/dashboard/charts'
      },
      screenSharing: {
        status: 'GET /api/screen-share/status/:deviceId',
        start: 'POST /api/screen-share/start',
        stop: 'POST /api/screen-share/stop/:deviceId',
        pause: 'POST /api/screen-share/pause/:deviceId',
        resume: 'POST /api/screen-share/resume/:deviceId',
        history: 'GET /api/screen-share/history/:deviceId',
        frame: 'GET /api/screen-share/frame/:deviceId'
      },
      screenRecording: {
        status: 'GET /api/screen-recording/status/:deviceId',
        start: 'POST /api/screen-recording/start',
        stop: 'POST /api/screen-recording/stop/:deviceId',
        pause: 'POST /api/screen-recording/pause/:deviceId',
        resume: 'POST /api/screen-recording/resume/:deviceId',
        history: 'GET /api/screen-recording/history/:deviceId',
        file: 'GET /api/screen-recording/file/:recordingId',
        delete: 'DELETE /api/screen-recording/:recordingId'
      },
      appMonitoring: {
        usage: 'GET /api/app-monitoring/usage/:deviceId',
        userUsage: 'GET /api/app-monitoring/usage/user/:userId',
        running: 'GET /api/app-monitoring/running/:deviceId',
        app: 'GET /api/app-monitoring/app/:deviceId/:package',
        stats: 'GET /api/app-monitoring/stats/:deviceId',
        screenTime: 'GET /api/app-monitoring/screentime/:deviceId',
        categories: 'GET /api/app-monitoring/categories/:deviceId'
      },
      messages: {
        device: 'GET /api/messages/device/:deviceId',
        thread: 'GET /api/messages/thread/:threadId',
        unread: 'GET /api/messages/unread/:deviceId',
        type: 'GET /api/messages/type/:deviceId/:type',
        read: 'POST /api/messages/read/:messageId',
        readAll: 'POST /api/messages/read-all/:deviceId',
        delete: 'DELETE /api/messages/:messageId',
        stats: 'GET /api/messages/stats/:deviceId',
        search: 'GET /api/messages/search/:deviceId',
        whatsapp: 'GET /api/messages/whatsapp/:deviceId',
        telegram: 'GET /api/messages/telegram/:deviceId'
      },
      invitations: {
        check: 'GET /api/invitations/check/:inviteCode',
        accept: 'POST /api/invitations/accept/:inviteCode',
        list: 'GET /api/invitations',
        detail: 'GET /api/invitations/:id',
        stats: 'GET /api/invitations/stats/overview',
        send: 'POST /api/invitations/send',
        bulk: 'POST /api/invitations/bulk-send',
        resend: 'POST /api/invitations/resend/:id',
        cancel: 'POST /api/invitations/cancel/:id'
      }
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
    connections: {
      total: global.io ? global.io.engine.clientsCount : 0,
      sockets: global.io ? Object.keys(global.io.sockets.sockets).length : 0
    },
    timestamp: new Date().toISOString()
  });
});

// SYSTEM INFO
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
      railway: !!process.env.RAILWAY_STATIC_URL,
      port: process.env.PORT,
      host: process.env.HOST
    },
    timestamp: new Date().toISOString()
  });
});

// ===== API ROUTES =====

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/users', auth.authenticate, userRoutes);
app.use('/api/devices', auth.authenticate, deviceRoutes);
app.use('/api/licenses', auth.authenticate, licenseRoutes);
app.use('/api/pins', auth.authenticate, pinRoutes);
app.use('/api/notifications', auth.authenticate, notificationRoutes);
app.use('/api/dashboard', auth.authenticate, dashboardRoutes);

// ===== ROUTES BARU =====

// Screen Sharing
app.use('/api/screen-share', auth.authenticate, role.isAdmin, screenShareRoutes);

// Screen Recording
app.use('/api/screen-recording', auth.authenticate, role.isAdmin, screenRecordingRoutes);

// App Monitoring
app.use('/api/app-monitoring', auth.authenticate, role.isAdmin, appMonitoringRoutes);

// Messages
app.use('/api/messages', auth.authenticate, role.isAdmin, messageRoutes);

// Invitations (mix of public and protected)
app.use('/api/invitations', invitationRoutes);

// ===== SOCKET.IO =====
io.use(auth.authenticateSocket);
io.on('connection', (socket) => {
  socketHandler.handleConnection(socket);
});

// ===== 404 HANDLER =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: {
      root: 'GET /',
      health: 'GET /health',
      api: 'GET /api',
      status: 'GET /api/status',
      system: 'GET /api/system-info',
      auth: 'POST /api/auth/login',
      users: 'GET /api/users',
      devices: 'GET /api/devices',
      licenses: 'GET /api/licenses',
      pins: 'GET /api/pins',
      notifications: 'GET /api/notifications',
      dashboard: 'GET /api/dashboard/stats',
      screenShare: 'GET /api/screen-share/status/:deviceId',
      screenRecording: 'GET /api/screen-recording/status/:deviceId',
      appMonitoring: 'GET /api/app-monitoring/usage/:deviceId',
      messages: 'GET /api/messages/device/:deviceId',
      invitations: 'GET /api/invitations'
    }
  });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error('Stack:', err.stack);
  
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

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  }
});

server.on('listening', () => {
  console.log(`✅ Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📍 Health check: http://${HOST}:${PORT}/health`);
  console.log(`📋 API Docs: http://${HOST}:${PORT}/api`);
  console.log(`🔌 Socket.IO: ws://${HOST}:${PORT}/socket.io/`);
});

// Start server dengan delay kecil untuk Railway
const startServer = () => {
  server.listen(PORT, HOST, () => {
    console.log(`🚀 Server started successfully on port ${PORT}`);
  });
};

// Mulai setelah 1 detik (untuk Railway)
setTimeout(startServer, 1000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ HTTP server closed');
    if (global.io) {
      global.io.close(() => {
        console.log('✅ Socket.IO server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('✅ HTTP server closed');
    if (global.io) {
      global.io.close(() => {
        console.log('✅ Socket.IO server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

module.exports = { app, server, io };
