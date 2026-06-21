const { getFirestore } = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');

class User {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.fullName = data.fullName || '';
    this.username = data.username || '';
    this.email = data.email || '';
    this.password = data.password || '';
    this.role = data.role || 'user';
    this.licenseType = data.licenseType || 'none';
    this.licenseExpired = data.licenseExpired || null;
    this.status = data.status || 'active';
    this.isEmailVerified = data.isEmailVerified || false;
    this.fcmTokens = data.fcmTokens || [];
    this.lastLogin = data.lastLogin || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.deletedAt = data.deletedAt || null;
    this.metadata = data.metadata || {};
  }

  static collection() {
    return getFirestore().collection('users');
  }

  static async create(userData) {
    const user = new User(userData);
    const userDataPlain = { ...user };
    delete userDataPlain.id;
    
    await User.collection().doc(user.id).set({
      ...userDataPlain,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return user;
  }

  static async findById(id) {
    const doc = await User.collection().doc(id).get();
    if (!doc.exists) return null;
    return new User({ id: doc.id, ...doc.data() });
  }

  static async findByEmail(email) {
    const snapshot = await User.collection()
      .where('email', '==', email)
      .where('deletedAt', '==', null)
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return new User({ id: doc.id, ...doc.data() });
  }

  static async findByUsername(username) {
    const snapshot = await User.collection()
      .where('username', '==', username)
      .where('deletedAt', '==', null)
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return new User({ id: doc.id, ...doc.data() });
  }

  static async findAll(filters = {}, options = {}) {
    let query = User.collection()
      .where('deletedAt', '==', null);

    if (filters.role) {
      query = query.where('role', '==', filters.role);
    }
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.search) {
      // Note: Firestore doesn't support full-text search natively
      // You might want to use Algolia or Elasticsearch for production
    }

    const snapshot = await query.get();
    const users = [];
    snapshot.forEach(doc => {
      users.push(new User({ id: doc.id, ...doc.data() }));
    });

    return users;
  }

  async update(data) {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    delete updateData.id;
    
    await User.collection().doc(this.id).update(updateData);
    Object.assign(this, data);
    this.updatedAt = new Date();
    return this;
  }

  async delete() {
    await User.collection().doc(this.id).update({
      deletedAt: new Date(),
      status: 'deleted'
    });
    this.deletedAt = new Date();
    this.status = 'deleted';
    return true;
  }

  async addFCMToken(token) {
    if (!this.fcmTokens.includes(token)) {
      this.fcmTokens.push(token);
      await this.update({ fcmTokens: this.fcmTokens });
    }
    return this;
  }

  async removeFCMToken(token) {
    this.fcmTokens = this.fcmTokens.filter(t => t !== token);
    await this.update({ fcmTokens: this.fcmTokens });
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      fullName: this.fullName,
      username: this.username,
      email: this.email,
      role: this.role,
      licenseType: this.licenseType,
      licenseExpired: this.licenseExpired,
      status: this.status,
      isEmailVerified: this.isEmailVerified,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata
    };
  }
}

module.exports = User;
