// src/models/ScreenRecording.js
const { getFirestore } = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');

class ScreenRecording {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.deviceId = data.deviceId || '';
    this.userId = data.userId || '';
    this.sessionId = data.sessionId || '';
    this.status = data.status || 'inactive'; // active, inactive, requested, paused, stopped, processing, completed, failed
    this.fileName = data.fileName || '';
    this.fileUrl = data.fileUrl || '';
    this.fileSize = data.fileSize || 0;
    this.duration = data.duration || 0; // in seconds
    this.startedAt = data.startedAt || null;
    this.endedAt = data.endedAt || null;
    this.pausedAt = data.pausedAt || null;
    this.resumedAt = data.resumedAt || null;
    this.settings = data.settings || {
      quality: 'medium',
      frameRate: 15,
      bitrate: 1024,
      resolution: '720p'
    };
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static collection() {
    return getFirestore().collection('screenRecordings');
  }

  static async create(data) {
    const recording = new ScreenRecording(data);
    const dataPlain = { ...recording };
    delete dataPlain.id;
    
    await ScreenRecording.collection().doc(recording.id).set({
      ...dataPlain,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return recording;
  }

  static async findById(id) {
    const doc = await ScreenRecording.collection().doc(id).get();
    if (!doc.exists) return null;
    return new ScreenRecording({ id: doc.id, ...doc.data() });
  }

  static async findByDeviceId(deviceId) {
    const snapshot = await ScreenRecording.collection()
      .where('deviceId', '==', deviceId)
      .where('status', 'in', ['active', 'requested', 'paused'])
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return new ScreenRecording({ id: doc.id, ...doc.data() });
  }

  static async findByUserId(userId, limit = 10) {
    const snapshot = await ScreenRecording.collection()
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    const recordings = [];
    snapshot.forEach(doc => {
      recordings.push(new ScreenRecording({ id: doc.id, ...doc.data() }));
    });
    return recordings;
  }

  static async findAll(filters = {}, options = {}) {
    let query = ScreenRecording.collection();

    if (filters.userId) query = query.where('userId', '==', filters.userId);
    if (filters.deviceId) query = query.where('deviceId', '==', filters.deviceId);
    if (filters.status) query = query.where('status', '==', filters.status);

    if (options.limit) query = query.limit(options.limit);
    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.order || 'desc');
    }

    const snapshot = await query.get();
    const items = [];
    snapshot.forEach(doc => {
      items.push(new ScreenRecording({ id: doc.id, ...doc.data() }));
    });

    return items;
  }

  async update(data) {
    const updateData = { ...data, updatedAt: new Date() };
    delete updateData.id;
    
    await ScreenRecording.collection().doc(this.id).update(updateData);
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

  async stop() {
    await this.update({
      status: 'stopped',
      endedAt: new Date()
    });
    return this;
  }

  async complete(fileUrl, fileSize, duration) {
    await this.update({
      status: 'completed',
      fileUrl,
      fileSize,
      duration,
      endedAt: new Date()
    });
    return this;
  }

  async fail(errorMessage) {
    await this.update({
      status: 'failed',
      metadata: { ...this.metadata, error: errorMessage }
    });
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      deviceId: this.deviceId,
      userId: this.userId,
      sessionId: this.sessionId,
      status: this.status,
      fileName: this.fileName,
      fileUrl: this.fileUrl,
      fileSize: this.fileSize,
      duration: this.duration,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      pausedAt: this.pausedAt,
      resumedAt: this.resumedAt,
      settings: this.settings,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = ScreenRecording;
