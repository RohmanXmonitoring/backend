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
const { SOCKET_EVENTS } = require('./utils/constants');

// Import middleware
const auth = require('./middleware/auth');
const role = require('./middleware/role');
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

// Socket.IO setup
const io = socketIO(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io/'
});

// Store io instance globally
global.io = io;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"]
    }
  }
}));

app.use(compression());

// CORS setup
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security sanitization
app.use(validator.sanitizeXSS);
app.use(validator.sanitizeMongo);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
app.use('/api/auth', RateLimiter.strict());
app.use('/api', RateLimiter.moderate());

// Health check
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'online',
    server: 'running',
    database: firebase.getFirestore() ? 'connected' : 'disconnected',
    redis: redis.isConnected() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  };
  res.status(200).json(healthStatus);
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
    env: process.env.NODE_ENV
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

// Socket.IO connection handling
io.use(auth.authenticateSocket);
io.on(SOCKET_EVENTS.CONNECT, (socket) => {
  socketHandler.handleConnection(socket);
});

// Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔒 Security: ${process.env.NODE_ENV === 'production' ? 'Production mode' : 'Development mode'}`);
});

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
  logger.info('🔄 Received shutdown signal, gracefully closing...');
  
  try {
    // Close server
    server.close(() => {
      logger.info('✅ HTTP server closed');
    });
    
    // Close Socket.IO connections
    io.close(() => {
      logger.info('✅ Socket.IO server closed');
    });
    
    // Close Redis connection
    if (redis.isConnected()) {
      await redis.getClient().quit();
      logger.info('✅ Redis connection closed');
    }
    
    logger.info('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
}

module.exports = { app, server, io };
