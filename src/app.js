// src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');

// Import configurations
const firebase = require('./config/firebase');
const redis = require('./config/redis');

// Import middleware
const auth = require('./middleware/auth');
const validator = require('./middleware/validator');
const RateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const licenseRoutes = require('./routes/licenseRoutes');
const pinRoutes = require('./routes/pinRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Import socket handlers
const socketHandler = require('./sockets');

// Import logger
const logger = require('./utils/logger');

// Create Express app
const app = express();
const server = http.createServer(app);

// Socket.IO setup with Railway compatible configuration
const io = socketIO(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN?.split(',') || ['*'],
    methods: ['GET', 'POST'],
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

// ===== MIDDLEWARE =====
// Security headers with Railway compatibility
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable for Railway
  crossOriginEmbedderPolicy: false
}));

// Compression
app.use(compression());

// CORS - Allow all in Railway
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parser with increased limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security sanitization
app.use(validator.sanitizeXSS);
app.use(validator.sanitizeMongo);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting with Railway compatibility
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
// Health check - MUST be first and simple
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    server: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Root route for Railway
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Admin Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api',
      docs: '/api-docs'
    }
  });
});

// System info
app.get('/api/system-info', (req, res) => {
  const os = require('os');
  res.status(200).json({
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV,
    railway: !!process.env.RAILWAY_STATIC_URL
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', auth.authenticate, userRoutes);
app.use('/api/devices', auth.authenticate, deviceRoutes);
app.use('/api/licenses', auth.authenticate, licenseRoutes);
app.use('/api/pins', auth.authenticate, pinRoutes);
app.use('/api/notifications', auth.authenticate, notificationRoutes);
app.use('/api/dashboard', auth.authenticate, dashboardRoutes);

// 404 handler
app.use(errorHandler.notFound);

// Error handler
app.use(errorHandler.handleError);

// ===== SOCKET.IO =====
io.use(auth.authenticateSocket);
io.on('connection', (socket) => {
  socketHandler.handleConnection(socket);
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Add error handling for server
server.on('error', (error) => {
  logger.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
    process.exit(1);
  }
});

server.on('listening', () => {
  logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔒 Railway: ${!!process.env.RAILWAY_STATIC_URL}`);
});

// Start server with timeout for Railway
const startServer = () => {
  server.listen(PORT, HOST, () => {
    logger.info(`✅ Server started successfully on port ${PORT}`);
  });
};

// Start with small delay for Railway
setTimeout(startServer, 1000);

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
  logger.info('🔄 Received shutdown signal...');
  
  try {
    // Close server
    server.close(() => {
      logger.info('✅ HTTP server closed');
    });
    
    // Close Socket.IO
    if (io) {
      io.close(() => {
        logger.info('✅ Socket.IO server closed');
      });
    }
    
    // Close Redis
    if (redis.isConnected()) {
      await redis.getClient().quit();
      logger.info('✅ Redis connection closed');
    }
    
    logger.info('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

module.exports = { app, server, io };
