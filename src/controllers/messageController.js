// src/controllers/messageController.js
const Message = require('../models/Message');
const Device = require('../models/Device');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class MessageController {
  async getDeviceMessages(req, res) {
    try {
      const { deviceId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const messages = await Message.findByDeviceId(deviceId, parseInt(limit));
      const total = messages.length;

      return ApiResponse.paginate(res,
        messages.map(m => m.toJSON()),
        total,
        Math.floor(offset / limit) + 1,
        parseInt(limit)
      );
    } catch (error) {
      logger.error('Get device messages error:', error);
      return ApiResponse.error(res, 'Failed to get messages');
    }
  }

  async getThreadMessages(req, res) {
    try {
      const { threadId } = req.params;
      const { limit = 50 } = req.query;

      const messages = await Message.findByThread(threadId, parseInt(limit));

      return ApiResponse.success(res, messages.map(m => m.toJSON()));
    } catch (error) {
      logger.error('Get thread messages error:', error);
      return ApiResponse.error(res, 'Failed to get thread messages');
    }
  }

  async getUnreadMessages(req, res) {
    try {
      const { deviceId } = req.params;

      const messages = await Message.findUnread(deviceId);

      return ApiResponse.success(res, {
        deviceId,
        count: messages.length,
        messages: messages.map(m => m.toJSON())
      });
    } catch (error) {
      logger.error('Get unread messages error:', error);
      return ApiResponse.error(res, 'Failed to get unread messages');
    }
  }

  async getMessagesByType(req, res) {
    try {
      const { deviceId, type } = req.params;
      const { limit = 50 } = req.query;

      const messages = await Message.findAll(
        { deviceId, type },
        { limit: parseInt(limit), orderBy: 'timestamp', order: 'desc' }
      );

      return ApiResponse.success(res, messages.map(m => m.toJSON()));
    } catch (error) {
      logger.error('Get messages by type error:', error);
      return ApiResponse.error(res, 'Failed to get messages');
    }
  }

  async getWhatsAppMessages(req, res) {
    try {
      const { deviceId } = req.params;
      const { limit = 50 } = req.query;

      const messages = await Message.findAll(
        { deviceId, type: 'whatsapp' },
        { limit: parseInt(limit), orderBy: 'timestamp', order: 'desc' }
      );

      return ApiResponse.success(res, messages.map(m => m.toJSON()));
    } catch (error) {
      logger.error('Get WhatsApp messages error:', error);
      return ApiResponse.error(res, 'Failed to get WhatsApp messages');
    }
  }

  async getTelegramMessages(req, res) {
    try {
      const { deviceId } = req.params;
      const { limit = 50 } = req.query;

      const messages = await Message.findAll(
        { deviceId, type: 'telegram' },
        { limit: parseInt(limit), orderBy: 'timestamp', order: 'desc' }
      );

      return ApiResponse.success(res, messages.map(m => m.toJSON()));
    } catch (error) {
      logger.error('Get Telegram messages error:', error);
      return ApiResponse.error(res, 'Failed to get Telegram messages');
    }
  }

  async markAsRead(req, res) {
    try {
      const { messageId } = req.params;

      const message = await Message.findById(messageId);
      if (!message) {
        return ApiResponse.notFound(res, 'Message not found');
      }

      await message.markAsRead();

      return ApiResponse.success(res, message.toJSON(), 'Message marked as read');
    } catch (error) {
      logger.error('Mark as read error:', error);
      return ApiResponse.error(res, 'Failed to mark as read');
    }
  }

  async markAllAsRead(req, res) {
    try {
      const { deviceId } = req.params;

      const messages = await Message.findUnread(deviceId);
      for (const message of messages) {
        await message.markAsRead();
      }

      return ApiResponse.success(res, {
        deviceId,
        count: messages.length
      }, 'All messages marked as read');
    } catch (error) {
      logger.error('Mark all as read error:', error);
      return ApiResponse.error(res, 'Failed to mark all as read');
    }
  }

  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;

      const message = await Message.findById(messageId);
      if (!message) {
        return ApiResponse.notFound(res, 'Message not found');
      }

      await message.markAsDeleted();

      return ApiResponse.success(res, null, 'Message deleted');
    } catch (error) {
      logger.error('Delete message error:', error);
      return ApiResponse.error(res, 'Failed to delete message');
    }
  }

  async getMessageStats(req, res) {
    try {
      const { deviceId } = req.params;

      const totalMessages = await Message.findAll({ deviceId });
      const unreadMessages = await Message.findUnread(deviceId);
      const whatsappMessages = await Message.findAll({ deviceId, type: 'whatsapp' });
      const telegramMessages = await Message.findAll({ deviceId, type: 'telegram' });

      return ApiResponse.success(res, {
        deviceId,
        stats: {
          total: totalMessages.length,
          unread: unreadMessages.length,
          whatsapp: whatsappMessages.length,
          telegram: telegramMessages.length,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Get message stats error:', error);
      return ApiResponse.error(res, 'Failed to get message stats');
    }
  }

  async searchMessages(req, res) {
    try {
      const { deviceId } = req.params;
      const { query, limit = 50 } = req.query;

      // Firebase doesn't support full-text search natively
      // This is a simple implementation - for production, use Algolia or Elasticsearch
      const messages = await Message.findAll(
        { deviceId },
        { limit: parseInt(limit), orderBy: 'timestamp', order: 'desc' }
      );

      const filtered = messages.filter(m => 
        m.message.toLowerCase().includes(query.toLowerCase()) ||
        m.sender.toLowerCase().includes(query.toLowerCase()) ||
        m.senderName.toLowerCase().includes(query.toLowerCase())
      );

      return ApiResponse.success(res, {
        deviceId,
        query,
        count: filtered.length,
        messages: filtered.map(m => m.toJSON())
      });
    } catch (error) {
      logger.error('Search messages error:', error);
      return ApiResponse.error(res, 'Failed to search messages');
    }
  }
}

module.exports = new MessageController();
