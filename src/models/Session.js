const { getFirestore } = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');
const redis = require('../config/redis');

class Session {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.userId = data.userId || '';
    this.token = data.token || '';
    this.refreshToken = data.refreshToken || '';
    this.deviceInfo = data.deviceInfo || {};
    this.ipAddress = data.ipAddress || '';
    this.userAgent = data.userAgent || '';
    this.status = data.status || 'active';
    this.expiresAt = data.expiresAt || null;
    this.lastActivity = data.lastActivity || new Date();
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.metadata = data.metadata || {};
  }

  static collection() {
    return getFirestore().collection('sessions');
  }

  static async create(sessionData) {
    const session = new Session(sessionData);
    const sessionDataPlain = { ...session };
    delete sessionDataPlain.id;
    
    await Session.collection().doc(session.id).set({
      ...sessionDataPlain,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Store in Redis for quick access
    if (redis.isConnected()) {
      await redis.setUserSession(session.userId, {
        sessionId: session.id,
        token: session.token,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt
      });
    }
    
    return session;
  }

  static async findById(id) {
    const doc = await Session.collection().doc(id).get();
    if (!doc.exists) return null;
    return new Session({ id: doc.id, ...doc.data() });
  }

  static async findByToken(token) {
    const snapshot = await Session.collection()
      .where('token', '==', token)
      .where('status', '==', 'active')
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return new Session({ id: doc.id, ...doc.data() });
  }

  static async findByUser(userId) {
    const snapshot = await Session.collection()
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get();
    
    const sessions = [];
    snapshot.forEach(doc => {
      sessions.push(new Session({ id: doc.id, ...doc.data() }));
    });
    return sessions;
  }

  async update(data) {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    delete updateData.id;
    
    await Session.collection().doc(this.id).update(updateData);
    Object.assign(this, data);
    this.updatedAt = new Date();

    // Update Redis
    if (redis.isConnected()) {
      await redis.setUserSession(this.userId, {
        sessionId: this.id,
        token: this.token,
        refreshToken: this.refreshToken,
        expiresAt: this.expiresAt
      });
    }
    
    return this;
  }

  async delete() {
    await Session.collection().doc(this.id).update({
      status: 'deleted',
      updatedAt: new Date()
    });
    this.status = 'deleted';

    // Remove from Redis
    if (redis.isConnected()) {
      await redis.deleteUserSession(this.userId);
    }
    
    return true;
  }

  async invalidate() {
    await this.update({
      status: 'invalidated'
    });
    return this;
  }

  async refreshActivity() {
    await this.update({
      lastActivity: new Date()
    });
    return this;
  }

  isExpired() {
    return this.expiresAt && new Date() > new Date(this.expiresAt);
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      deviceInfo: this.deviceInfo,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      status: this.status,
      expiresAt: this.expiresAt,
      lastActivity: this.lastActivity,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata,
      isExpired: this.isExpired()
    };
  }
}

module.exports = Session;
