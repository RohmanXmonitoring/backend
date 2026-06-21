// src/models/Message.js
const { getFirestore } = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');

class Message {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.deviceId = data.deviceId || '';
    this.userId = data.userId || '';
    this.type = data.type || 'whatsapp'; // whatsapp, telegram, sms, notification
    this.sender = data.sender || '';
    this.senderName = data.senderName || '';
    this.recipient = data.recipient || '';
    this.recipientName = data.recipientName || '';
    this.message = data.message || '';
    this.timestamp = data.timestamp || new Date();
    this.status = data.status || 'unread'; // read, unread, deleted, archived
    this.isGroup = data.isGroup || false;
    this.groupName = data.groupName || '';
    this.attachments = data.attachments || [];
    this.threadId = data.threadId || '';
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static collection() {
    return getFirestore().collection('messages');
  }

  static async create(data) {
    const message = new Message(data);
    const dataPlain = { ...message };
    delete dataPlain.id;
    
    await Message.collection().doc(message.id).set({
      ...dataPlain,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return message;
  }

  static async findById(id) {
    const doc = await Message.collection().doc(id).get();
    if (!doc.exists) return null;
    return new Message({ id: doc.id, ...doc.data() });
  }

  static async findByDeviceId(deviceId, limit = 50) {
    const snapshot = await Message.collection()
      .where('deviceId', '==', deviceId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    const messages = [];
    snapshot.forEach(doc => {
      messages.push(new Message({ id: doc.id, ...doc.data() }));
    });
    return messages;
  }

  static async findByThread(threadId, limit = 50) {
    const snapshot = await Message.collection()
      .where('threadId', '==', threadId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    const messages = [];
    snapshot.forEach(doc => {
      messages.push(new Message({ id: doc.id, ...doc.data() }));
    });
    return messages;
  }

  static async findUnread(deviceId) {
    const snapshot = await Message.collection()
      .where('deviceId', '==', deviceId)
      .where('status', '==', 'unread')
      .orderBy('timestamp', 'desc')
      .get();
    
    const messages = [];
    snapshot.forEach(doc => {
      messages.push(new Message({ id: doc.id, ...doc.data() }));
    });
    return messages;
  }

  static async findAll(filters = {}, options = {}) {
    let query = Message.collection();

    if (filters.deviceId) query = query.where('deviceId', '==', filters.deviceId);
    if (filters.userId) query = query.where('userId', '==', filters.userId);
    if (filters.type) query = query.where('type', '==', filters.type);
    if (filters.status) query = query.where('status', '==', filters.status);
    if (filters.sender) query = query.where('sender', '==', filters.sender);
    if (filters.recipient) query = query.where('recipient', '==', filters.recipient);
    if (filters.threadId) query = query.where('threadId', '==', filters.threadId);

    if (options.limit) query = query.limit(options.limit);
    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.order || 'desc');
    }

    const snapshot = await query.get();
    const items = [];
    snapshot.forEach(doc => {
      items.push(new Message({ id: doc.id, ...doc.data() }));
    });

    return items;
  }

  async update(data) {
    const updateData = { ...data, updatedAt: new Date() };
    delete updateData.id;
    
    await Message.collection().doc(this.id).update(updateData);
    Object.assign(this, data);
    this.updatedAt = new Date();
    return this;
  }

  async markAsRead() {
    await this.update({ status: 'read' });
    return this;
  }

  async markAsDeleted() {
    await this.update({ status: 'deleted' });
    return this;
  }

  async archive() {
    await this.update({ status: 'archived' });
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      deviceId: this.deviceId,
      userId: this.userId,
      type: this.type,
      sender: this.sender,
      senderName: this.senderName,
      recipient: this.recipient,
      recipientName: this.recipientName,
      message: this.message,
      timestamp: this.timestamp,
      status: this.status,
      isGroup: this.isGroup,
      groupName: this.groupName,
      attachments: this.attachments,
      threadId: this.threadId,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Message;
