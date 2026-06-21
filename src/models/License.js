const { getFirestore } = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');

class License {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.licenseKey = data.licenseKey || '';
    this.type = data.type || 'user_30days';
    this.userId = data.userId || '';
    this.status = data.status || 'active';
    this.issuedAt = data.issuedAt || new Date();
    this.expiredAt = data.expiredAt || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.metadata = data.metadata || {};
  }

  static collection() {
    return getFirestore().collection('licenses');
  }

  static async create(licenseData) {
    const license = new License(licenseData);
    const licenseDataPlain = { ...license };
    delete licenseDataPlain.id;
    
    await License.collection().doc(license.id).set({
      ...licenseDataPlain,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return license;
  }

  static async findById(id) {
    const doc = await License.collection().doc(id).get();
    if (!doc.exists) return null;
    return new License({ id: doc.id, ...doc.data() });
  }

  static async findByLicenseKey(licenseKey) {
    const snapshot = await License.collection()
      .where('licenseKey', '==', licenseKey)
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return new License({ id: doc.id, ...doc.data() });
  }

  static async findAll(filters = {}, options = {}) {
    let query = License.collection();

    if (filters.userId) {
      query = query.where('userId', '==', filters.userId);
    }
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.type) {
      query = query.where('type', '==', filters.type);
    }
    if (filters.expired) {
      query = query.where('expiredAt', '<', new Date());
    }

    const snapshot = await query.get();
    const licenses = [];
    snapshot.forEach(doc => {
      licenses.push(new License({ id: doc.id, ...doc.data() }));
    });

    return licenses;
  }

  static async findActive() {
    return License.findAll({ status: 'active' });
  }

  static async findExpired() {
    return License.findAll({ expired: true });
  }

  static async findExpiringSoon(days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    const snapshot = await License.collection()
      .where('status', '==', 'active')
      .where('expiredAt', '<=', futureDate)
      .where('expiredAt', '>=', new Date())
      .get();
    
    const licenses = [];
    snapshot.forEach(doc => {
      licenses.push(new License({ id: doc.id, ...doc.data() }));
    });
    return licenses;
  }

  async update(data) {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    delete updateData.id;
    
    await License.collection().doc(this.id).update(updateData);
    Object.assign(this, data);
    this.updatedAt = new Date();
    return this;
  }

  async delete() {
    await License.collection().doc(this.id).update({
      status: 'deleted',
      updatedAt: new Date()
    });
    this.status = 'deleted';
    return true;
  }

  async extend(days) {
    const newExpiredAt = new Date(this.expiredAt || new Date());
    newExpiredAt.setDate(newExpiredAt.getDate() + days);
    
    await this.update({
      expiredAt: newExpiredAt,
      status: 'active'
    });
    return this;
  }

  async disable() {
    await this.update({
      status: 'disabled'
    });
    return this;
  }

  isExpired() {
    return this.expiredAt && new Date() > new Date(this.expiredAt);
  }

  getDaysRemaining() {
    if (!this.expiredAt) return -1;
    const now = new Date();
    const expired = new Date(this.expiredAt);
    const diff = expired - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  toJSON() {
    return {
      id: this.id,
      licenseKey: this.licenseKey,
      type: this.type,
      userId: this.userId,
      status: this.status,
      issuedAt: this.issuedAt,
      expiredAt: this.expiredAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata,
      isExpired: this.isExpired(),
      daysRemaining: this.getDaysRemaining()
    };
  }
}

module.exports = License;
