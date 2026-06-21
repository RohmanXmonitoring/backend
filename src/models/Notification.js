const { getFirestore } = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');

class Notification {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.title = data.title || '';
    this.body = data.body || '';
    this.type = data.type || 'broadcast';
    this.priority = data.priority || 'normal';
    this.userId = data.userId || null;
    this.role = data.role || null;
    this.status = data.status || 'pending';
    this.sentAt = data.sentAt || null;
    this.readAt = data.readAt || null;
    this.readBy = data.readBy || [];
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.metadata = data.metadata || {};
  }

  static collection() {
    return getFirestore().collection('notifications');
  }

  static async create(notificationData) {
    const notification = new Notification(notificationData);
    const notificationDataPlain = { ...notification };
    delete notificationDataPlain.id;
    
    await Notification.collection().doc(notification.id).set({
      ...notificationDataPlain,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return notification;
  }

  static async findById(id) {
    const doc = await Notification.collection().doc(id).get();
    if (!doc.exists) return null;
    return new Notification({ id: doc.id, ...doc.data() });
  }

  static async findAll(filters = {}, options = {}) {
    let query = Notification.collection();

    if (filters.userId) {
      query = query.where('userId', '==', filters.userId);
    }
    if (filters.type) {
      query = query.where('type', '==', filters.type);
    }
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.role) {
      query = query.where('role', '==', filters.role);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.order || 'desc');
    }

    const snapshot = await query.get();
    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push(new Notification({ id: doc.id, ...doc.data() }));
    });

    return notifications;
  }

  static async findUnread(userId) {
    const snapshot = await Notification.collection()
      .where('userId', '==', userId)
      .where('status', '==', 'sent')
      .get();
    
    const notifications = [];
    snapshot.forEach(doc => {
      const notification = new Notification({ id: doc.id, ...doc.data() });
      if (!notification.readBy.includes(userId)) {
        notifications.push(notification);
      }
    });
    return notifications;
  }

  async update(data) {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    delete updateData.id;
    
    await Notification.collection().doc(this.id).update(updateData);
    Object.assign(this, data);
    this.updatedAt = new Date();
    return this;
  }

  async delete() {
    await Notification.collection().doc(this.id).delete();
    return true;
  }

  async markAsSent() {
    await this.update({
      status: 'sent',
      sentAt: new Date()
    });
    return this;
  }

  async markAsRead(userId) {
    if (!this.readBy.includes(userId)) {
      this.readBy.push(userId);
      await this.update({ readBy: this.readBy });
    }
    return this;
  }

  async markAsDelivered() {
    await this.update({
      status: 'delivered'
    });
    return this;
  }

  async markAsFailed() {
    await this.update({
      status: 'failed'
    });
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      body: this.body,
      type: this.type,
      priority: this.priority,
      userId: this.userId,
      role: this.role,
      status: this.status,
      sentAt: this.sentAt,
      readAt: this.readAt,
      readBy: this.readBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata
    };
  }
}

module.exports = Notification;
