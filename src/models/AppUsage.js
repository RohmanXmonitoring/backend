// src/models/AppUsage.js
const { getFirestore } = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');

class AppUsage {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.deviceId = data.deviceId || '';
    this.userId = data.userId || '';
    this.appName = data.appName || '';
    this.appPackage = data.appPackage || '';
    this.appCategory = data.appCategory || '';
    this.isSystemApp = data.isSystemApp || false;
    this.status = data.status || 'background'; // foreground, background, active, inactive
    this.usageTime = data.usageTime || 0; // in seconds
    this.lastUsed = data.lastUsed || null;
    this.firstUsed = data.firstUsed || null;
    this.sessionCount = data.sessionCount || 0;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static collection() {
    return getFirestore().collection('appUsages');
  }

  static async create(data) {
    const usage = new AppUsage(data);
    const dataPlain = { ...usage };
    delete dataPlain.id;
    
    await AppUsage.collection().doc(usage.id).set({
      ...dataPlain,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return usage;
  }

  static async findById(id) {
    const doc = await AppUsage.collection().doc(id).get();
    if (!doc.exists) return null;
    return new AppUsage({ id: doc.id, ...doc.data() });
  }

  static async findByDeviceAndApp(deviceId, appPackage) {
    const snapshot = await AppUsage.collection()
      .where('deviceId', '==', deviceId)
      .where('appPackage', '==', appPackage)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return new AppUsage({ id: doc.id, ...doc.data() });
  }

  static async findByDeviceId(deviceId, limit = 100) {
    const snapshot = await AppUsage.collection()
      .where('deviceId', '==', deviceId)
      .orderBy('usageTime', 'desc')
      .limit(limit)
      .get();
    
    const usages = [];
    snapshot.forEach(doc => {
      usages.push(new AppUsage({ id: doc.id, ...doc.data() }));
    });
    return usages;
  }

  static async findByUserId(userId, limit = 100) {
    const snapshot = await AppUsage.collection()
      .where('userId', '==', userId)
      .orderBy('usageTime', 'desc')
      .limit(limit)
      .get();
    
    const usages = [];
    snapshot.forEach(doc => {
      usages.push(new AppUsage({ id: doc.id, ...doc.data() }));
    });
    return usages;
  }

  static async getTodayUsage(userId, deviceId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const snapshot = await AppUsage.collection()
      .where('userId', '==', userId)
      .where('deviceId', '==', deviceId)
      .where('updatedAt', '>=', today)
      .get();
    
    const usages = [];
    snapshot.forEach(doc => {
      usages.push(new AppUsage({ id: doc.id, ...doc.data() }));
    });
    return usages;
  }

  async update(data) {
    const updateData = { ...data, updatedAt: new Date() };
    delete updateData.id;
    
    await AppUsage.collection().doc(this.id).update(updateData);
    Object.assign(this, data);
    this.updatedAt = new Date();
    return this;
  }

  async addUsageTime(seconds) {
    this.usageTime += seconds;
    this.lastUsed = new Date();
    await this.update({ 
      usageTime: this.usageTime,
      lastUsed: this.lastUsed
    });
    return this;
  }

  async incrementSession() {
    this.sessionCount += 1;
    await this.update({ sessionCount: this.sessionCount });
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      deviceId: this.deviceId,
      userId: this.userId,
      appName: this.appName,
      appPackage: this.appPackage,
      appCategory: this.appCategory,
      isSystemApp: this.isSystemApp,
      status: this.status,
      usageTime: this.usageTime,
      lastUsed: this.lastUsed,
      firstUsed: this.firstUsed,
      sessionCount: this.sessionCount,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = AppUsage;
