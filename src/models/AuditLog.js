const { getFirestore } = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');

class AuditLog {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.userId = data.userId || '';
    this.userEmail = data.userEmail || '';
    this.action = data.action || '';
    this.resourceType = data.resourceType || '';
    this.resourceId = data.resourceId || '';
    this.details = data.details || {};
    this.ipAddress = data.ipAddress || '';
    this.userAgent = data.userAgent || '';
    this.status = data.status || 'success';
    this.timestamp = data.timestamp || new Date();
    this.metadata = data.metadata || {};
  }

  static collection() {
    return getFirestore().collection('auditLogs');
  }

  static async create(logData) {
    const log = new AuditLog(logData);
    const logDataPlain = { ...log };
    delete logDataPlain.id;
    
    await AuditLog.collection().doc(log.id).set({
      ...logDataPlain,
      timestamp: new Date()
    });
    
    return log;
  }

  static async findById(id) {
    const doc = await AuditLog.collection().doc(id).get();
    if (!doc.exists) return null;
    return new AuditLog({ id: doc.id, ...doc.data() });
  }

  static async findAll(filters = {}, options = {}) {
    let query = AuditLog.collection();

    if (filters.userId) {
      query = query.where('userId', '==', filters.userId);
    }
    if (filters.action) {
      query = query.where('action', '==', filters.action);
    }
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.resourceType) {
      query = query.where('resourceType', '==', filters.resourceType);
    }
    if (filters.fromDate) {
      query = query.where('timestamp', '>=', filters.fromDate);
    }
    if (filters.toDate) {
      query = query.where('timestamp', '<=', filters.toDate);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.order || 'desc');
    }

    const snapshot = await query.get();
    const logs = [];
    snapshot.forEach(doc => {
      logs.push(new AuditLog({ id: doc.id, ...doc.data() }));
    });

    return logs;
  }

  static async findByUser(userId, limit = 100) {
    const snapshot = await AuditLog.collection()
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    const logs = [];
    snapshot.forEach(doc => {
      logs.push(new AuditLog({ id: doc.id, ...doc.data() }));
    });
    return logs;
  }

  static async findByAction(action, limit = 100) {
    const snapshot = await AuditLog.collection()
      .where('action', '==', action)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    const logs = [];
    snapshot.forEach(doc => {
      logs.push(new AuditLog({ id: doc.id, ...doc.data() }));
    });
    return logs;
  }

  static async getRecent(limit = 100) {
    const snapshot = await AuditLog.collection()
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    const logs = [];
    snapshot.forEach(doc => {
      logs.push(new AuditLog({ id: doc.id, ...doc.data() }));
    });
    return logs;
  }

  async delete() {
    await AuditLog.collection().doc(this.id).delete();
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      userEmail: this.userEmail,
      action: this.action,
      resourceType: this.resourceType,
      resourceId: this.resourceId,
      details: this.details,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      status: this.status,
      timestamp: this.timestamp,
      metadata: this.metadata
    };
  }
}

module.exports = AuditLog;
