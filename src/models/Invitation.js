// src/models/Invitation.js
const { getFirestore } = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');

class Invitation {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.email = data.email || '';
    this.inviteCode = data.inviteCode || this.generateInviteCode();
    this.type = data.type || 'user'; // user, reseller, admin
    this.role = data.role || 'user';
    this.status = data.status || 'pending'; // pending, sent, accepted, expired, cancelled
    this.invitedBy = data.invitedBy || ''; // userId yang mengundang
    this.invitedByName = data.invitedByName || '';
    this.userData = data.userData || {}; // Data user yang akan dibuat
    this.deviceLimit = data.deviceLimit || 1;
    this.licenseType = data.licenseType || 'user_30days';
    this.expiredAt = data.expiredAt || null;
    this.acceptedAt = data.acceptedAt || null;
    this.sentAt = data.sentAt || null;
    this.reminderSent = data.reminderSent || [];
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static collection() {
    return getFirestore().collection('invitations');
  }

  generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  static async create(data) {
    const invitation = new Invitation(data);
    const dataPlain = { ...invitation };
    delete dataPlain.id;
    
    await Invitation.collection().doc(invitation.id).set({
      ...dataPlain,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return invitation;
  }

  static async findById(id) {
    const doc = await Invitation.collection().doc(id).get();
    if (!doc.exists) return null;
    return new Invitation({ id: doc.id, ...doc.data() });
  }

  static async findByEmail(email) {
    const snapshot = await Invitation.collection()
      .where('email', '==', email)
      .where('status', 'in', ['pending', 'sent'])
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return new Invitation({ id: doc.id, ...doc.data() });
  }

  static async findByInviteCode(inviteCode) {
    const snapshot = await Invitation.collection()
      .where('inviteCode', '==', inviteCode)
      .where('status', 'in', ['pending', 'sent'])
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return new Invitation({ id: doc.id, ...doc.data() });
  }

  static async findByInvitedBy(invitedBy, limit = 100) {
    const snapshot = await Invitation.collection()
      .where('invitedBy', '==', invitedBy)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    const invitations = [];
    snapshot.forEach(doc => {
      invitations.push(new Invitation({ id: doc.id, ...doc.data() }));
    });
    return invitations;
  }

  static async findAll(filters = {}, options = {}) {
    let query = Invitation.collection();

    if (filters.email) query = query.where('email', '==', filters.email);
    if (filters.status) query = query.where('status', '==', filters.status);
    if (filters.type) query = query.where('type', '==', filters.type);
    if (filters.invitedBy) query = query.where('invitedBy', '==', filters.invitedBy);
    if (filters.expired) {
      query = query.where('expiredAt', '<', new Date())
        .where('status', 'in', ['pending', 'sent']);
    }

    if (options.limit) query = query.limit(options.limit);
    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.order || 'desc');
    }

    const snapshot = await query.get();
    const items = [];
    snapshot.forEach(doc => {
      items.push(new Invitation({ id: doc.id, ...doc.data() }));
    });

    return items;
  }

  async update(data) {
    const updateData = { ...data, updatedAt: new Date() };
    delete updateData.id;
    
    await Invitation.collection().doc(this.id).update(updateData);
    Object.assign(this, data);
    this.updatedAt = new Date();
    return this;
  }

  async send() {
    await this.update({
      status: 'sent',
      sentAt: new Date()
    });
    return this;
  }

  async accept() {
    await this.update({
      status: 'accepted',
      acceptedAt: new Date()
    });
    return this;
  }

  async expire() {
    await this.update({
      status: 'expired'
    });
    return this;
  }

  async cancel() {
    await this.update({
      status: 'cancelled'
    });
    return this;
  }

  async addReminder(day) {
    if (!this.reminderSent.includes(day)) {
      this.reminderSent.push(day);
      await this.update({ reminderSent: this.reminderSent });
    }
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
      email: this.email,
      inviteCode: this.inviteCode,
      type: this.type,
      role: this.role,
      status: this.status,
      invitedBy: this.invitedBy,
      invitedByName: this.invitedByName,
      userData: this.userData,
      deviceLimit: this.deviceLimit,
      licenseType: this.licenseType,
      expiredAt: this.expiredAt,
      acceptedAt: this.acceptedAt,
      sentAt: this.sentAt,
      reminderSent: this.reminderSent,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isExpired: this.isExpired(),
      daysRemaining: this.getDaysRemaining()
    };
  }
}

module.exports = Invitation;
