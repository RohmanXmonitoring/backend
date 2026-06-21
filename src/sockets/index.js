// src/sockets/index.js
const { SOCKET_EVENTS } = require('../utils/constants');
const User = require('../models/User');
const Device = require('../models/Device');
const ScreenShare = require('../models/ScreenShare');
const ScreenRecording = require('../models/ScreenRecording');
const AppUsage = require('../models/AppUsage');
const Message = require('../models/Message');
const Invitation = require('../models/Invitation');
const redis = require('../config/redis');
const logger = require('../utils/logger');

class SocketHandler {
  constructor() {
    this.clients = new Map();
    this.userSockets = new Map();
    this.deviceSockets = new Map(); // Track device connections
    this.screenShareSessions = new Map(); // Track active screen shares
    this.recordingSessions = new Map(); // Track active recordings
  }

  handleConnection(socket) {
    const userId = socket.user.id;
    
    logger.info(`🔌 Socket connected: ${socket.id} for user ${userId}`);

    // Store socket
    this.clients.set(socket.id, {
      socket,
      userId,
      user: socket.user,
      connectedAt: new Date(),
      isDevice: socket.handshake.query.type === 'device'
    });

    // Jika ini adalah koneksi dari device (Android)
    if (socket.handshake.query.type === 'device') {
      const deviceId = socket.handshake.query.deviceId;
      if (deviceId) {
        this.deviceSockets.set(deviceId, socket.id);
        logger.info(`📱 Device connected: ${deviceId}`);
        this.handleDeviceConnection(socket, deviceId);
      }
    }

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

    // ===== AUTH EVENTS =====
    socket.on(SOCKET_EVENTS.AUTH, (data) => {
      this.handleAuthUpdate(socket, data);
    });

    // ===== DEVICE EVENTS =====
    socket.on('device_update', (data) => {
      this.handleDeviceUpdate(socket, data);
    });

    socket.on('device_online', (data) => {
      this.handleDeviceOnline(socket, data);
    });

    socket.on('device_offline', (data) => {
      this.handleDeviceOffline(socket, data);
    });

    socket.on('device_info', (data) => {
      this.handleDeviceInfo(socket, data);
    });

    // ===== SCREEN SHARING EVENTS =====
    socket.on('screen_share_accept', (data) => {
      this.handleScreenShareAccept(socket, data);
    });

    socket.on('screen_share_reject', (data) => {
      this.handleScreenShareReject(socket, data);
    });

    socket.on('screen_share_frame', (data) => {
      this.handleScreenShareFrame(socket, data);
    });

    socket.on('screen_share_stopped', (data) => {
      this.handleScreenShareStopped(socket, data);
    });

    socket.on('screen_share_paused', (data) => {
      this.handleScreenSharePaused(socket, data);
    });

    socket.on('screen_share_resumed', (data) => {
      this.handleScreenShareResumed(socket, data);
    });

    // ===== SCREEN RECORDING EVENTS =====
    socket.on('recording_accept', (data) => {
      this.handleRecordingAccept(socket, data);
    });

    socket.on('recording_reject', (data) => {
      this.handleRecordingReject(socket, data);
    });

    socket.on('recording_chunk', (data) => {
      this.handleRecordingChunk(socket, data);
    });

    socket.on('recording_completed', (data) => {
      this.handleRecordingCompleted(socket, data);
    });

    socket.on('recording_stopped', (data) => {
      this.handleRecordingStopped(socket, data);
    });

    socket.on('recording_paused', (data) => {
      this.handleRecordingPaused(socket, data);
    });

    socket.on('recording_resumed', (data) => {
      this.handleRecordingResumed(socket, data);
    });

    // ===== APP MONITORING EVENTS =====
    socket.on('app_usage_update', (data) => {
      this.handleAppUsageUpdate(socket, data);
    });

    socket.on('app_opened', (data) => {
      this.handleAppOpened(socket, data);
    });

    socket.on('app_closed', (data) => {
      this.handleAppClosed(socket, data);
    });

    socket.on('app_foreground', (data) => {
      this.handleAppForeground(socket, data);
    });

    socket.on('app_background', (data) => {
      this.handleAppBackground(socket, data);
    });

    socket.on('running_apps', (data) => {
      this.handleRunningApps(socket, data);
    });

    // ===== MESSAGE EVENTS =====
    socket.on('message_received', (data) => {
      this.handleMessageReceived(socket, data);
    });

    socket.on('message_read', (data) => {
      this.handleMessageRead(socket, data);
    });

    socket.on('message_deleted', (data) => {
      this.handleMessageDeleted(socket, data);
    });

    socket.on('whatsapp_messages', (data) => {
      this.handleWhatsAppMessages(socket, data);
    });

    socket.on('telegram_messages', (data) => {
      this.handleTelegramMessages(socket, data);
    });

    // ===== NOTIFICATION EVENTS =====
    socket.on('notification_read', (data) => {
      this.handleNotificationRead(socket, data);
    });

    socket.on('notification_received', (data) => {
      this.handleNotificationReceived(socket, data);
    });

    // ===== INVITATION EVENTS =====
    socket.on('invitation_sent', (data) => {
      this.handleInvitationSent(socket, data);
    });

    socket.on('invitation_accepted', (data) => {
      this.handleInvitationAccepted(socket, data);
    });

    socket.on('invitation_expired', (data) => {
      this.handleInvitationExpired(socket, data);
    });

    // ===== SYSTEM EVENTS =====
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  }

  // ===== DEVICE HANDLERS =====
  async handleDeviceConnection(socket, deviceId) {
    try {
      // Update device status
      const device = await Device.findById(deviceId);
      if (device) {
        await device.setOnline();
        this.emitDeviceConnected(device);
      }
    } catch (error) {
      logger.error('Device connection error:', error);
    }
  }

  async handleDeviceOnline(socket, data) {
    try {
      const { deviceId } = data;
      const device = await Device.findById(deviceId);
      if (device) {
        await device.setOnline();
        this.emitDeviceConnected(device);
      }
    } catch (error) {
      logger.error('Device online error:', error);
    }
  }

  async handleDeviceOffline(socket, data) {
    try {
      const { deviceId } = data;
      const device = await Device.findById(deviceId);
      if (device) {
        await device.setOffline();
        this.emitDeviceDisconnected(device);
      }
    } catch (error) {
      logger.error('Device offline error:', error);
    }
  }

  async handleDeviceInfo(socket, data) {
    try {
      const { deviceId, info } = data;
      const device = await Device.findById(deviceId);
      if (device) {
        await device.update({
          brand: info.brand || device.brand,
          model: info.model || device.model,
          androidVersion: info.androidVersion || device.androidVersion,
          battery: info.battery || device.battery,
          storage: info.storage || device.storage,
          ram: info.ram || device.ram,
          metadata: { ...device.metadata, ...info.metadata }
        });
        this.emitDeviceUpdated(device);
      }
    } catch (error) {
      logger.error('Device info error:', error);
    }
  }

  // ===== SCREEN SHARING HANDLERS =====
  async handleScreenShareAccept(socket, data) {
    try {
      const { screenShareId, deviceId } = data;
      
      const screenShare = await ScreenShare.findById(screenShareId);
      if (screenShare) {
        await screenShare.start();
        
        // Store session
        this.screenShareSessions.set(screenShareId, {
          deviceId,
          adminSocket: socket.id,
          startedAt: new Date()
        });

        // Notify admin
        this.emitToUser(screenShare.invitedBy || screenShare.userId, 'screen_share_started', {
          screenShareId: screenShare.id,
          deviceId,
          timestamp: new Date().toISOString()
        });

        // Broadcast to all admins
        this.emitToRole('admin', 'screen_share_active', {
          screenShareId: screenShare.id,
          deviceId,
          userId: screenShare.userId,
          timestamp: new Date().toISOString()
        });

        logger.info(`Screen sharing started: ${screenShareId}`);
      }
    } catch (error) {
      logger.error('Screen share accept error:', error);
    }
  }

  async handleScreenShareReject(socket, data) {
    try {
      const { screenShareId, reason } = data;
      
      const screenShare = await ScreenShare.findById(screenShareId);
      if (screenShare) {
        await screenShare.update({ status: 'stopped' });

        // Notify admin
        this.emitToUser(screenShare.invitedBy || screenShare.userId, 'screen_share_rejected', {
          screenShareId: screenShare.id,
          reason: reason || 'User rejected',
          timestamp: new Date().toISOString()
        });

        logger.info(`Screen sharing rejected: ${screenShareId}`);
      }
    } catch (error) {
      logger.error('Screen share reject error:', error);
    }
  }

  async handleScreenShareFrame(socket, data) {
    try {
      const { screenShareId, frameData, timestamp } = data;
      
      // Forward frame to admin viewers
      const session = this.screenShareSessions.get(screenShareId);
      if (session) {
        this.emitToUser(session.adminSocket, 'screen_share_frame', {
          screenShareId,
          frameData,
          timestamp: timestamp || new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Screen share frame error:', error);
    }
  }

  async handleScreenShareStopped(socket, data) {
    try {
      const { screenShareId, deviceId } = data;
      
      const screenShare = await ScreenShare.findById(screenShareId);
      if (screenShare) {
        await screenShare.stop();

        // Remove session
        this.screenShareSessions.delete(screenShareId);

        // Notify admin
        this.emitToAll('screen_share_stopped', {
          screenShareId,
          deviceId,
          timestamp: new Date().toISOString()
        });

        logger.info(`Screen sharing stopped: ${screenShareId}`);
      }
    } catch (error) {
      logger.error('Screen share stopped error:', error);
    }
  }

  async handleScreenSharePaused(socket, data) {
    try {
      const { screenShareId } = data;
      
      const screenShare = await ScreenShare.findById(screenShareId);
      if (screenShare) {
        await screenShare.pause();

        this.emitToAll('screen_share_paused', {
          screenShareId,
          timestamp: new Date().toISOString()
        });

        logger.info(`Screen sharing paused: ${screenShareId}`);
      }
    } catch (error) {
      logger.error('Screen share paused error:', error);
    }
  }

  async handleScreenShareResumed(socket, data) {
    try {
      const { screenShareId } = data;
      
      const screenShare = await ScreenShare.findById(screenShareId);
      if (screenShare) {
        await screenShare.resume();

        this.emitToAll('screen_share_resumed', {
          screenShareId,
          timestamp: new Date().toISOString()
        });

        logger.info(`Screen sharing resumed: ${screenShareId}`);
      }
    } catch (error) {
      logger.error('Screen share resumed error:', error);
    }
  }

  // ===== SCREEN RECORDING HANDLERS =====
  async handleRecordingAccept(socket, data) {
    try {
      const { recordingId, deviceId } = data;
      
      const recording = await ScreenRecording.findById(recordingId);
      if (recording) {
        await recording.start();

        this.recordingSessions.set(recordingId, {
          deviceId,
          adminSocket: socket.id,
          startedAt: new Date(),
          chunks: []
        });

        this.emitToUser(recording.userId, 'recording_started', {
          recordingId: recording.id,
          deviceId,
          timestamp: new Date().toISOString()
        });

        logger.info(`Recording started: ${recordingId}`);
      }
    } catch (error) {
      logger.error('Recording accept error:', error);
    }
  }

  async handleRecordingReject(socket, data) {
    try {
      const { recordingId, reason } = data;
      
      const recording = await ScreenRecording.findById(recordingId);
      if (recording) {
        await recording.update({ status: 'stopped' });

        this.emitToUser(recording.userId, 'recording_rejected', {
          recordingId: recording.id,
          reason: reason || 'User rejected',
          timestamp: new Date().toISOString()
        });

        logger.info(`Recording rejected: ${recordingId}`);
      }
    } catch (error) {
      logger.error('Recording reject error:', error);
    }
  }

  async handleRecordingChunk(socket, data) {
    try {
      const { recordingId, chunkData, sequence } = data;
      
      const session = this.recordingSessions.get(recordingId);
      if (session) {
        session.chunks.push({
          sequence,
          data: chunkData,
          timestamp: new Date().toISOString()
        });

        // Forward to admin
        this.emitToUser(session.adminSocket, 'recording_chunk', {
          recordingId,
          chunkData,
          sequence,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Recording chunk error:', error);
    }
  }

  async handleRecordingCompleted(socket, data) {
    try {
      const { recordingId, fileUrl, fileSize, duration } = data;
      
      const recording = await ScreenRecording.findById(recordingId);
      if (recording) {
        await recording.complete(fileUrl, fileSize, duration);

        // Remove session
        this.recordingSessions.delete(recordingId);

        this.emitToAll('recording_completed', {
          recordingId,
          fileUrl,
          fileSize,
          duration,
          timestamp: new Date().toISOString()
        });

        logger.info(`Recording completed: ${recordingId}`);
      }
    } catch (error) {
      logger.error('Recording completed error:', error);
    }
  }

  async handleRecordingStopped(socket, data) {
    try {
      const { recordingId } = data;
      
      const recording = await ScreenRecording.findById(recordingId);
      if (recording) {
        await recording.stop();

        this.recordingSessions.delete(recordingId);

        this.emitToAll('recording_stopped', {
          recordingId,
          timestamp: new Date().toISOString()
        });

        logger.info(`Recording stopped: ${recordingId}`);
      }
    } catch (error) {
      logger.error('Recording stopped error:', error);
    }
  }

  async handleRecordingPaused(socket, data) {
    try {
      const { recordingId } = data;
      
      const recording = await ScreenRecording.findById(recordingId);
      if (recording) {
        await recording.pause();

        this.emitToAll('recording_paused', {
          recordingId,
          timestamp: new Date().toISOString()
        });

        logger.info(`Recording paused: ${recordingId}`);
      }
    } catch (error) {
      logger.error('Recording paused error:', error);
    }
  }

  async handleRecordingResumed(socket, data) {
    try {
      const { recordingId } = data;
      
      const recording = await ScreenRecording.findById(recordingId);
      if (recording) {
        await recording.resume();

        this.emitToAll('recording_resumed', {
          recordingId,
          timestamp: new Date().toISOString()
        });

        logger.info(`Recording resumed: ${recordingId}`);
      }
    } catch (error) {
      logger.error('Recording resumed error:', error);
    }
  }

  // ===== APP MONITORING HANDLERS =====
  async handleAppUsageUpdate(socket, data) {
    try {
      const { deviceId, apps } = data;

      for (const app of apps) {
        let appUsage = await AppUsage.findByDeviceAndApp(deviceId, app.appPackage);
        
        if (appUsage) {
          await appUsage.update({
            usageTime: app.usageTime || appUsage.usageTime,
            lastUsed: new Date(),
            status: app.status || appUsage.status,
            metadata: { ...appUsage.metadata, ...app.metadata }
          });
        } else {
          await AppUsage.create({
            deviceId,
            userId: socket.user.id,
            ...app
          });
        }
      }

      // Broadcast update
      this.emitToAll('app_usage_updated', {
        deviceId,
        apps,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('App usage update error:', error);
    }
  }

  async handleAppOpened(socket, data) {
    try {
      const { deviceId, appPackage, appName } = data;

      let appUsage = await AppUsage.findByDeviceAndApp(deviceId, appPackage);
      if (appUsage) {
        await appUsage.update({
          status: 'foreground',
          lastUsed: new Date(),
          sessionCount: appUsage.sessionCount + 1
        });
        await appUsage.incrementSession();
      } else {
        await AppUsage.create({
          deviceId,
          userId: socket.user.id,
          appPackage,
          appName,
          status: 'foreground',
          lastUsed: new Date(),
          firstUsed: new Date()
        });
      }

      this.emitToAll('app_opened', {
        deviceId,
        appPackage,
        appName,
        userId: socket.user.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('App opened error:', error);
    }
  }

  async handleAppClosed(socket, data) {
    try {
      const { deviceId, appPackage, appName } = data;

      const appUsage = await AppUsage.findByDeviceAndApp(deviceId, appPackage);
      if (appUsage) {
        await appUsage.update({ status: 'inactive' });
      }

      this.emitToAll('app_closed', {
        deviceId,
        appPackage,
        appName,
        userId: socket.user.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('App closed error:', error);
    }
  }

  async handleAppForeground(socket, data) {
    try {
      const { deviceId, appPackage } = data;

      const appUsage = await AppUsage.findByDeviceAndApp(deviceId, appPackage);
      if (appUsage) {
        await appUsage.update({ status: 'foreground' });
      }

      this.emitToAll('app_foreground', {
        deviceId,
        appPackage,
        userId: socket.user.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('App foreground error:', error);
    }
  }

  async handleAppBackground(socket, data) {
    try {
      const { deviceId, appPackage } = data;

      const appUsage = await AppUsage.findByDeviceAndApp(deviceId, appPackage);
      if (appUsage) {
        await appUsage.update({ status: 'background' });
      }

      this.emitToAll('app_background', {
        deviceId,
        appPackage,
        userId: socket.user.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('App background error:', error);
    }
  }

  async handleRunningApps(socket, data) {
    try {
      const { deviceId, apps } = data;

      // Update all running apps
      for (const app of apps) {
        let appUsage = await AppUsage.findByDeviceAndApp(deviceId, app.appPackage);
        if (appUsage) {
          await appUsage.update({
            status: 'foreground',
            lastUsed: new Date()
          });
        }
      }

      this.emitToAll('running_apps_updated', {
        deviceId,
        apps,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Running apps error:', error);
    }
  }

  // ===== MESSAGE HANDLERS =====
  async handleMessageReceived(socket, data) {
    try {
      const { deviceId, message } = data;

      const newMessage = await Message.create({
        deviceId,
        userId: socket.user.id,
        ...message
      });

      // Broadcast to admins
      this.emitToRole('admin', 'new_message', {
        message: newMessage.toJSON(),
        deviceId,
        timestamp: new Date().toISOString()
      });

      // Also send to specific user if needed
      if (message.recipient) {
        this.emitToUser(message.recipient, 'message_received', {
          message: newMessage.toJSON(),
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`New message received: ${newMessage.id}`);

    } catch (error) {
      logger.error('Message received error:', error);
    }
  }

  async handleMessageRead(socket, data) {
    try {
      const { messageId } = data;

      const message = await Message.findById(messageId);
      if (message) {
        await message.markAsRead();

        this.emitToAll('message_read', {
          messageId,
          userId: socket.user.id,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logger.error('Message read error:', error);
    }
  }

  async handleMessageDeleted(socket, data) {
    try {
      const { messageId } = data;

      const message = await Message.findById(messageId);
      if (message) {
        await message.markAsDeleted();

        this.emitToAll('message_deleted', {
          messageId,
          userId: socket.user.id,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logger.error('Message deleted error:', error);
    }
  }

  async handleWhatsAppMessages(socket, data) {
    try {
      const { deviceId, messages } = data;

      for (const msg of messages) {
        await Message.create({
          deviceId,
          userId: socket.user.id,
          type: 'whatsapp',
          ...msg
        });
      }

      this.emitToAll('whatsapp_messages_updated', {
        deviceId,
        count: messages.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('WhatsApp messages error:', error);
    }
  }

  async handleTelegramMessages(socket, data) {
    try {
      const { deviceId, messages } = data;

      for (const msg of messages) {
        await Message.create({
          deviceId,
          userId: socket.user.id,
          type: 'telegram',
          ...msg
        });
      }

      this.emitToAll('telegram_messages_updated', {
        deviceId,
        count: messages.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Telegram messages error:', error);
    }
  }

  // ===== NOTIFICATION HANDLERS =====
  async handleNotificationReceived(socket, data) {
    try {
      const { notification } = data;

      this.emitToAll('notification_received', {
        notification,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Notification received error:', error);
    }
  }

  // ===== INVITATION HANDLERS =====
  async handleInvitationSent(socket, data) {
    try {
      const { invitation } = data;

      this.emitToAll('invitation_sent', {
        invitation,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Invitation sent error:', error);
    }
  }

  async handleInvitationAccepted(socket, data) {
    try {
      const { invitationId, userId } = data;

      this.emitToAll('invitation_accepted', {
        invitationId,
        userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Invitation accepted error:', error);
    }
  }

  async handleInvitationExpired(socket, data) {
    try {
      const { invitationId } = data;

      this.emitToAll('invitation_expired', {
        invitationId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Invitation expired error:', error);
    }
  }

  // ===== EXISTING HANDLERS =====
  async handleAuthUpdate(socket, data) {
    try {
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
        await device.update(data);
        this.emitDeviceUpdated(device);
      }
    } catch (error) {
      logger.error('Device update error:', error);
    }
  }

  async handleNotificationRead(socket, data) {
    try {
      this.emitToAll(SOCKET_EVENTS.NOTIFICATION_READ, {
        notificationId: data.notificationId,
        userId: socket.user.id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Notification read error:', error);
    }
  }

  // ===== DISCONNECT HANDLER =====
  async handleDisconnect(socket) {
    const userId = socket.user.id;
    const socketId = socket.id;

    logger.info(`🔌 Socket disconnected: ${socketId} for user ${userId}`);

    // Check if this was a device connection
    for (const [deviceId, sockId] of this.deviceSockets) {
      if (sockId === socketId) {
        this.deviceSockets.delete(deviceId);
        const device = await Device.findById(deviceId);
        if (device) {
          await device.setOffline();
          this.emitDeviceDisconnected(device);
        }
        break;
      }
    }

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
    if (redis.isConnected && redis.isConnected()) {
      await redis.setUserOffline(userId);
    }

    // Cleanup screen share sessions
    for (const [sessionId, session] of this.screenShareSessions) {
      if (session.adminSocket === socketId || session.deviceId === userId) {
        this.screenShareSessions.delete(sessionId);
      }
    }

    // Cleanup recording sessions
    for (const [sessionId, session] of this.recordingSessions) {
      if (session.adminSocket === socketId || session.deviceId === userId) {
        this.recordingSessions.delete(sessionId);
      }
    }
  }

  // ===== ONLINE STATUS =====
  async setUserOnline(userId, socket) {
    try {
      const user = await User.findById(userId);
      if (user) {
        await user.update({ lastLogin: new Date() });
      }

      if (redis.isConnected && redis.isConnected()) {
        await redis.setUserOnline(userId);
      }

      this.emitToAll(SOCKET_EVENTS.USER_ONLINE, {
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
      if (redis.isConnected && redis.isConnected()) {
        await redis.setUserOffline(userId);
      }

      this.emitToAll(SOCKET_EVENTS.USER_OFFLINE, {
        userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error setting user offline:', error);
    }
  }

  // ===== INITIAL DATA =====
  sendInitialData(socket) {
    socket.emit(SOCKET_EVENTS.SYSTEM_STATUS, {
      status: 'connected',
      timestamp: new Date().toISOString(),
      serverTime: new Date().toISOString()
    });

    socket.emit('user_data', {
      user: socket.user.toJSON(),
      timestamp: new Date().toISOString()
    });

    // Send device list if admin
    if (socket.user.role === 'admin' || socket.user.role === 'super_admin') {
      this.sendDeviceList(socket);
    }
  }

  async sendDeviceList(socket) {
    try {
      const devices = await Device.findAll({ status: 'active' });
      socket.emit('device_list', {
        devices: devices.map(d => d.toJSON()),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Send device list error:', error);
    }
  }

  // ===== EMIT METHODS =====
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

  // ===== EXISTING EMIT METHODS =====
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

  // ===== UTILITY METHODS =====
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
      connectedDevices: this.deviceSockets.size,
      activeScreenShares: this.screenShareSessions.size,
      activeRecordings: this.recordingSessions.size,
      timestamp: new Date().toISOString()
    };
  }

  getDeviceSocket(deviceId) {
    const socketId = this.deviceSockets.get(deviceId);
    if (socketId) {
      const client = this.clients.get(socketId);
      return client ? client.socket : null;
    }
    return null;
  }

  isDeviceOnline(deviceId) {
    return this.deviceSockets.has(deviceId);
  }

  async sendToDevice(deviceId, event, data) {
    const socket = this.getDeviceSocket(deviceId);
    if (socket) {
      socket.emit(event, data);
      return true;
    }
    return false;
  }
}

module.exports = new SocketHandler();
