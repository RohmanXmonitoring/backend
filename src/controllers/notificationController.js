const Notification = require('../models/Notification');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const socketHandler = require('../sockets');
const { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } = require('../utils/constants');
const firebase = require('../config/firebase');

class NotificationController {
  async getAllNotifications(req, res) {
    try {
      const { userId, type, status } = req.query;
      const { page, limit, sort, order } = req.pagination;

      const filters = {};
      if (userId) filters.userId = userId;
      if (type) filters.type = type;
      if (status) filters.status = status;

      const notifications = await Notification.findAll(filters, {
        limit,
        skip: (page - 1) * limit,
        sort,
        order
      });

      const total = await Notification.count(filters);

      return ApiResponse.paginate(res,
        notifications.map(n => n.toJSON()),
        total,
        page,
        limit
      );
    } catch (error) {
      logger.error('Get all notifications error:', error);
      return ApiResponse.error(res, 'Failed to get notifications');
    }
  }

  async getNotificationById(req, res) {
    try {
      const { id } = req.params;
      const notification = await Notification.findById(id);

      if (!notification) {
        return ApiResponse.notFound(res, 'Notification not found');
      }

      return ApiResponse.success(res, notification.toJSON());
    } catch (error) {
      logger.error('Get notification by id error:', error);
      return ApiResponse.error(res, 'Failed to get notification');
    }
  }

  async createNotification(req, res) {
    try {
      const { title, body, type, priority, userId, role, data } = req.body;

      const notification = await Notification.create({
        title,
        body,
        type: type || NOTIFICATION_TYPES.BROADCAST,
        priority: priority || NOTIFICATION_PRIORITY.NORMAL,
        userId: userId || null,
        role: role || null,
        status: 'pending',
        metadata: data || {}
      });

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'create_notification',
        resourceType: 'notification',
        resourceId: notification.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      // Emit socket event
      socketHandler.emitNotificationCreated(notification);

      return ApiResponse.created(res, notification.toJSON(), 'Notification created successfully');
    } catch (error) {
      logger.error('Create notification error:', error);
      return ApiResponse.error(res, 'Failed to create notification');
    }
  }

  async deleteNotification(req, res) {
    try {
      const { id } = req.params;

      const notification = await Notification.findById(id);
      if (!notification) {
        return ApiResponse.notFound(res, 'Notification not found');
      }

      await notification.delete();

      return ApiResponse.success(res, null, 'Notification deleted successfully');
    } catch (error) {
      logger.error('Delete notification error:', error);
      return ApiResponse.error(res, 'Failed to delete notification');
    }
  }

  async sendNotification(req, res) {
    try {
      const { id } = req.params;

      const notification = await Notification.findById(id);
      if (!notification) {
        return ApiResponse.notFound(res, 'Notification not found');
      }

      // Send notification based on type
      let recipients = [];

      if (notification.type === NOTIFICATION_TYPES.BROADCAST) {
        // Send to all users
        const users = await User.findAll({ status: 'active' });
        recipients = users.map(u => u.id);
      } else if (notification.type === NOTIFICATION_TYPES.USER && notification.userId) {
        recipients = [notification.userId];
      } else if (notification.type === NOTIFICATION_TYPES.ROLE && notification.role) {
        const users = await User.findAll({ role: notification.role, status: 'active' });
        recipients = users.map(u => u.id);
      }

      // Send FCM notifications
      if (recipients.length > 0) {
        await this.sendFCMNotifications(notification, recipients);
      }

      await notification.markAsSent();

      // Log audit
      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'send_notification',
        resourceType: 'notification',
        resourceId: notification.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { recipients: recipients.length }
      });

      return ApiResponse.success(res, notification.toJSON(), 'Notification sent successfully');
    } catch (error) {
      logger.error('Send notification error:', error);
      return ApiResponse.error(res, 'Failed to send notification');
    }
  }

  async broadcastNotification(req, res) {
    try {
      const { title, body, priority, data } = req.body;

      const notification = await Notification.create({
        title,
        body,
        type: NOTIFICATION_TYPES.BROADCAST,
        priority: priority || NOTIFICATION_PRIORITY.NORMAL,
        status: 'pending',
        metadata: data || {}
      });

      // Send to all users
      const users = await User.findAll({ status: 'active' });
      const recipients = users.map(u => u.id);

      if (recipients.length > 0) {
        await this.sendFCMNotifications(notification, recipients);
      }

      await notification.markAsSent();

      await AuditLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'broadcast_notification',
        resourceType: 'notification',
        resourceId: notification.id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { recipients: recipients.length }
      });

      // Emit socket event
      socketHandler.emitNotificationCreated(notification);

      return ApiResponse.created(res, notification.toJSON(), 'Broadcast sent successfully');
    } catch (error) {
      logger.error('Broadcast notification error:', error);
      return ApiResponse.error(res, 'Failed to send broadcast');
    }
  }

  async getMyNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { page, limit, sort, order } = req.pagination;

      const filters = { userId };
      const notifications = await Notification.findAll(filters, {
        limit,
        skip: (page - 1) * limit,
        sort: sort || 'createdAt',
        order: order || 'desc'
      });

      const total = await Notification.count(filters);

      return ApiResponse.paginate(res,
        notifications.map(n => n.toJSON()),
        total,
        page,
        limit
      );
    } catch (error) {
      logger.error('Get my notifications error:', error);
      return ApiResponse.error(res, 'Failed to get notifications');
    }
  }

  async markAsRead(req, res) {
    try {
      const { notificationId } = req.body;
      const userId = req.user.id;

      const notification = await Notification.findById(notificationId);
      if (!notification) {
        return ApiResponse.notFound(res, 'Notification not found');
      }

      await notification.markAsRead(userId);

      return ApiResponse.success(res, notification.toJSON(), 'Notification marked as read');
    } catch (error) {
      logger.error('Mark as read error:', error);
      return ApiResponse.error(res, 'Failed to mark as read');
    }
  }

  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      const notifications = await Notification.findUnread(userId);

      for (const notification of notifications) {
        await notification.markAsRead(userId);
      }

      return ApiResponse.success(res, null, 'All notifications marked as read');
    } catch (error) {
      logger.error('Mark all as read error:', error);
      return ApiResponse.error(res, 'Failed to mark all as read');
    }
  }

  async sendFCMNotifications(notification, recipients) {
    try {
      const messaging = firebase.getMessaging();

      // Get FCM tokens for recipients
      const tokens = [];
      for (const userId of recipients) {
        const user = await User.findById(userId);
        if (user && user.fcmTokens && user.fcmTokens.length > 0) {
          tokens.push(...user.fcmTokens);
        }
      }

      if (tokens.length === 0) {
        return;
      }

      // Prepare message
      const message = {
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: {
          notificationId: notification.id,
          type: notification.type,
          priority: notification.priority,
          ...notification.metadata
        },
        tokens: tokens
      };

      // Send multicast
      const response = await messaging.sendEachForMulticast(message);
      
      logger.info(`FCM notification sent to ${response.successCount} devices`);
      
      if (response.failureCount > 0) {
        logger.warn(`${response.failureCount} FCM notifications failed`);
      }

    } catch (error) {
      logger.error('Send FCM notification error:', error);
    }
  }
}

module.exports = new NotificationController();
