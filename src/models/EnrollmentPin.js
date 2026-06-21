const { getFirestore } = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class EnrollmentPin {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.pinCode = data.pinCode || this.generatePin();
    this.status = data.status || 'active';
    this.deviceLimit = data.deviceLimit || 1;
    this.usedCount = data.usedCount || 0;
    this.userId = data.userId || '';
    this.expiredAt = data.expiredAt || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.metadata = data.metadata || {};
  }

  static collection() {
    return getFirestore().collection('enrollmentPins');
  }

  generatePin() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  static async create(pinData) {
    const pin = new EnrollmentPin(pinData);
    const pinDataPlain = { ...pin };
    delete pinDataPlain.id;
    
    await EnrollmentPin.collection().doc(pin.id).set({
      ...pinDataPlain,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return pin;
  }

  static async findById(id) {
    const doc = await EnrollmentPin.collection().doc(id).get();
    if (!doc.exists) return null;
    return new EnrollmentPin({ id: doc.id, ...doc.data() });
  }

  static async findByPin(pinCode) {
    const snapshot = await EnrollmentPin.collection()
      .where('pinCode', '==', pinCode)
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return new EnrollmentPin({ id: doc.id, ...doc.data() });
  }

  static async findAll(filters = {}, options = {}) {
    let query = EnrollmentPin.collection();

    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.userId) {
      query = query.where('userId', '==', filters.userId);
    }
    if (filters.active) {
      query = query.where('status', '==', 'active')
        .where('expiredAt', '>', new Date());
    }

    const snapshot = await query.get();
    const pins = [];
    snapshot.forEach(doc => {
      pins.push(new EnrollmentPin({ id: doc.id, ...doc.data() }));
    });

    return pins;
  }

  static async findActive() {
    return EnrollmentPin.findAll({ active: true });
  }

  async update(data) {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    delete updateData.id;
    
    await EnrollmentPin.collection().doc(this.id).update(updateData);
    Object.assign(this, data);
    this.updatedAt = new Date();
    return this;
  }

  async delete() {
    await EnrollmentPin.collection().doc(this.id).update({
      status: 'deleted',
      updatedAt: new Date()
    });
    this.status = 'deleted';
    return true;
  }

  async use() {
    if (this.usedCount >= this.deviceLimit) {
      throw new Error('Device limit reached');
    }
    if (this.isExpired()) {
      throw new Error('PIN has expired');
    }
    if (this.status !== 'active') {
      throw new Error('PIN is not active');
    }

    this.usedCount += 1;
    await this.update({ usedCount: this.usedCount });
    
    if (this.usedCount >= this.deviceLimit) {
      await this.update({ status: 'used' });
    }
    
    return this;
  }

  async disable() {
    await this.update({
      status: 'disabled'
    });
    return this;
  }

  async expire() {
    await this.update({
      status: 'expired',
      expiredAt: new Date()
    });
    return this;
  }

  isExpired() {
    return this.expiredAt && new Date() > new Date(this.expiredAt);
  }

  isFull() {
    return this.usedCount >= this.deviceLimit;
  }

  toJSON() {
    return {
      id: this.id,
      pinCode: this.pinCode,
      status: this.status,
      deviceLimit: this.deviceLimit,
      usedCount: this.usedCount,
      userId: this.userId,
      expiredAt: this.expiredAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata,
      isExpired: this.isExpired(),
      isFull: this.isFull(),
      remainingSlots: this.deviceLimit - this.usedCount
    };
  }
}

module.exports = EnrollmentPin;
