// src/models/ScreenShare.js
const { getFirestore } = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');

class ScreenShare {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.deviceId = data.deviceId || '';
    this.userId = data.userId || '';
    this.status = data.status || 'inactive'; // active, inactive, requested, paused, stopped
    this.sessionId = data.sessionId || '';
    this.startedAt = data.startedAt || null;
    this.endedAt = data.endedAt || null;
    this.pausedAt = data.pausedAt || null;
    this.resumedAt = data.resumedAt || null;
    this.viewers = data.viewers || [];
    this.settings = data.settings || {
      quality: 'medium',
      frameRate: 10,
      bitrate: 512
    };
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static collection() {
    return getFirestore().collection('screenShares');
  }

  static async create(data) {
    const screenShare = new ScreenShare(data);
    const dataPlain = { ...screenShare };
    delete dataPlain.id;
    
    await ScreenShare.collection().doc(screenShare.id).set({
      ...dataPlain,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return screenShare;
  }

  static async findById(id) {
    const doc = await ScreenShare.collection().doc(id).get();
    if (!doc.exists) return null;
    return new ScreenShare({ id: doc.id, ...doc.data() });
  }

  static async findByDeviceId(deviceId) {
    const snapshot = await ScreenShare.collection()
      .where('deviceId', '==', deviceId)
      .where('status', 'in', ['active', 'requested', 'paused'])
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return new ScreenShare({ id: doc.id, ...doc.data() });
  }

  static async findByUserId(userId) {
    const snapshot = await ScreenShare.collection()
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return new ScreenShare({ id: doc.id, ...doc.data() });
  }

  static async findAll(filters = {}, options = {}) {
    let query = ScreenShare.collection();

    if (filters.userId) query = query.where('userId', '==', filters.userId);
    if (filters.deviceId) query = query.where('deviceId', '==', filters.deviceId);
    if (filters.status) query = query.where('status', '==', filters.status);

    const snapshot = await query.get();
    const items = [];
    snapshot.forEach(doc => {
      items.push(new ScreenShare({ id: doc.id, ...doc.data() }));
    });

    return items;
  }

  async update(data) {
    const updateData = { ...data, updatedAt: new Date() };
    delete updateData.id;
    
    await ScreenShare.collection().doc(this.id).update(updateData);
    Object.assign(this, data);
    this.updatedAt = new Date();
    return this;
  }

  async start() {
    await this.update({
      status: 'active',
      startedAt: new Date()
    });
    return this;
  }

  async stop() {
    await this.update({
      status: 'stopped',
      endedAt: new Date()
    });
    return this;
  }

  async pause() {
    await this.update({
      status: 'paused',
      pausedAt: new Date()
    });
    return this;
  }

  async resume() {
    await this.update({
      status: 'active',
      resumedAt: new Date()
    });
    return this;
  }

  async addViewer(viewerId) {
    if (!this.viewers.includes(viewerId)) {
      this.viewers.push(viewerId);
      await this.update({ viewers: this.viewers });
    }
    return this;
  }

  async removeViewer(viewerId) {
    this.viewers = this.viewers.filter(v => v !== viewerId);
    await this.update({ viewers: this.viewers });
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      deviceId: this.deviceId,
      userId: this.userId,
      status: this.status,
      sessionId: this.sessionId,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      pausedAt: this.pausedAt,
      resumedAt: this.resumedAt,
      viewers: this.viewers,
      settings: this.settings,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = ScreenShare;
