const { SOCKET_EVENTS } = require('../utils/constants');
const User = require('../models/User');
const Device = require('../models/Device');
const redis = require('../config/redis');
const logger = require('../utils/logger');

class SocketHandler {
  constructor() {
    this.clients = new Map();
    this.userSockets = new Map();
  }

  handleConnection(socket) {
    const userId = socket.user.id;
    
    logger.info(`🔌 Socket connected: ${socket.id} for user ${userId}`);

    // Store socket
    this.clients.set(socket.id, {
      socket,
      userId,
      user: socket.user,
      connectedAt: new Date()
    });

    // Add to user sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);

    // Update online status
    this.setUserOnline(userId, socket);

    // Send initial data
    this.sendInitialData(socket);

    // Set up event listeners
    this.setupEventListeners(socket);

    // Handle disconnect
    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      this.handleDisconnect(socket);
    });
  }

  setupEventListeners(socket) {
    const userId = socket.user.id;

    // Join user-specific room
    socket.join(`user:${userId}`);
    
    // Join role-specific room
    socket.join(`role:${socket.user.role}`);

    // Listen for auth updates
    socket.on(SOCKET_EVENTS.AUTH, (data) => {
      this.handleAuthUpdate(socket, data);
    });

    // Listen for device updates
    socket.on('device_update', (data) => {
      this.handleDeviceUpdate(socket, data);
    });

    // Listen for notification read
    socket.on('notification_read', (data) => {
      this.handleNotificationRead(socket, data);
    });

    // Ping for keep-alive
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });
  }

  async handleDisconnect(socket) {
    const userId = socket.user.id;
    const socketId = socket.id;

    logger.info(`🔌 Socket disconnected: ${socketId} for user ${userId}`);

    // Remove from clients
    this.clients.delete(socketId);

    // Remove from user sockets
    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(socketId);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
        await this.setUserOffline(userId);
      }
    }

    // Remove from Redis online users
    if (redis.isConnected()) {
      await redis.setUserOffline(userId);
    }
  }

  async setUserOnline(userId, socket) {
    try {
      // Update user in database
      const user = await User.findById(userId);
      if (user) {
        await user.update({ lastLogin: new Date() });
      }

      // Update in Redis
      if (redis.isConnected()) {
        await redis.setUserOnline(userId);
      }

      // Broadcast to all clients
      global.io.emit(SOCKET_EVENTS.USER_ONLINE, {
        userId,
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error setting user online:', error);
    }
  }

  async setUserOffline(userId) {
    try {
      // Update in Redis
      if (redis.isConnected()) {
        await redis.setUserOffline(userId);
      }

      // Broadcast to all clients
      global.io.emit(SOCKET_EVENTS.USER_OFFLINE, {
        userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error setting user offline:', error);
    }
  }

  sendInitialData(socket) {
    // Send system status
    socket.emit(SOCKET_EVENTS.SYSTEM_STATUS, {
      status: 'connected',
      timestamp: new Date().toISOString(),
      serverTime: new Date().toISOString()
    });

    // Send user data
    socket.emit('user_data', {
      user: socket.user.toJSON(),
      timestamp: new Date().toISOString()
    });
  }

  async handleAuthUpdate(socket, data) {
    try {
      // Handle authentication update
      const user = await User.findById(socket.user.id);
      if (user) {
        socket.emit('auth_update', {
          success: true,
          user: user.toJSON(),
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Auth update error:', error);
      socket.emit('auth_update', {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleDeviceUpdate(socket, data) {
    try {
      const device = await Device.findById(data.deviceId);
      if (device) {
        // Broadcast device update to all clients
        global.io.emit(SOCKET_EVENTS.DEVICE_UPDATED, {
          device: device.toJSON(),
          updatedBy: socket.user.id,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Device update error:', error);
    }
  }

  async handleNotificationRead(socket, data) {
    try {
      // Broadcast notification read status
      global.io.emit(SOCKET_EVENTS.NOTIFICATION_READ, {
        notificationId: data.notificationId,
        userId: socket.user.id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Notification read error:', error);
    }
  }

  // Emit methods
  emitToUser(userId, event, data) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach(socketId => {
        const client = this.clients.get(socketId);
        if (client) {
          client.socket.emit(event, data);
        }
      });
    }
  }

  emitToRole(role, event, data) {
    global.io.to(`role:${role}`).emit(event, data);
  }

  emitToAll(event, data) {
    global.io.emit(event, data);
  }

  emitUserCreated(user) {
    this.emitToAll(SOCKET_EVENTS.USER_CREATED, {
      user: user.toJSON(),
      timestamp: new Date().toISOString()
    });
  }

  emitUserUpdated(user) {
    this.emitToAll(SOCKET_EVENTS.USER_UPDATED, {
      user: user.toJSON(),
      timestamp: new Date().toISOString()
    });
  }

  emitUserDeleted(userId) {
    this.emitToAll(SOCKET_EVENTS.USER_DELETED, {
      userId,
      timestamp: new Date().toISOString()
    });
  }

  emitDeviceConnected(device) {
    this.emitToAll(SOCKET_EVENTS.DEVICE_CONNECTED, {
      device: device.toJSON(),
      timestamp: new Date().toISOString()
    });
  }

  emitDeviceDisconnected(device) {
    this.emitToAll(SOCKET_EVENTS.DEVICE_DISCONNECTED, {
      device: device.toJSON(),
      timestamp: new Date().toISOString()
    });
  }

  emitDeviceUpdated(device) {
    this.emitToAll(SOCKET_EVENTS.DEVICE_UPDATED, {
      device: device.toJSON(),
      timestamp: new Date().toISOString()
    });
  }

  emitLicenseExpired(license) {
    this.emitToAll(SOCKET_EVENTS.LICENSE_EXPIRED, {
      license: license.toJSON(),
      timestamp: new Date().toISOString()
    });
  }

  emitPinUsed(pin) {
    this.emitToAll(SOCKET_EVENTS.PIN_USED, {
      pin: pin.toJSON(),
      timestamp: new Date().toISOString()
    });
  }

  emitNotificationCreated(notification) {
    this.emitToAll(SOCKET_EVENTS.NOTIFICATION_CREATED, {
      notification: notification.toJSON(),
      timestamp: new Date().toISOString()
    });
  }

  emitDashboardUpdate(dashboardData) {
    this.emitToAll(SOCKET_EVENTS.DASHBOARD_UPDATE, {
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  }

  getOnlineUsers() {
    return Array.from(this.userSockets.keys());
  }

  getUserSocketCount(userId) {
    return this.userSockets.get(userId)?.size || 0;
  }

  getTotalConnections() {
    return this.clients.size;
  }

  getConnectionStats() {
    return {
      totalConnections: this.clients.size,
      onlineUsers: this.userSockets.size,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new SocketHandler();
