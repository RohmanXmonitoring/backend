const { getFirestore } = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');

class Device {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.deviceName = data.deviceName || '';
    this.deviceId = data.deviceId || '';
    this.brand = data.brand || '';
    this.model = data.model || '';
    this.androidVersion = data.androidVersion || '';
    this.battery = data.battery || 0;
    this.storage = data.storage || '';
    this.ram = data.ram || '';
    this.networkStatus = data.networkStatus || 'offline';
    this.lastOnline = data.lastOnline || null;
    this.userId = data.userId || '';
    this.status = data.status || 'active';
    this.lostMode = data.lostMode || false;
    this.isOnline = data.isOnline || false;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.metadata = data.metadata || {};
  }

  static collection() {
    return getFirestore().collection('devices');
  }

  static async create(deviceData) {
    const device = new Device(deviceData);
    const deviceDataPlain = { ...device };
    delete deviceDataPlain.id;
    
    await Device.collection().doc(device.id).set({
      ...deviceDataPlain,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return device;
  }

  static async findById(id) {
    const doc = await Device.collection().doc(id).get();
    if (!doc.exists) return null;
    return new Device({ id: doc.id, ...doc.data() });
  }

  static async findByDeviceId(deviceId) {
    const snapshot = await Device.collection()
      .where('deviceId', '==', deviceId)
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return new Device({ id: doc.id, ...doc.data() });
  }

  static async findAll(filters = {}, options = {}) {
    let query = Device.collection();

    if (filters.userId) {
      query = query.where('userId', '==', filters.userId);
    }
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.isOnline !== undefined) {
      query = query.where('isOnline', '==', filters.isOnline);
    }
    if (filters.lostMode !== undefined) {
      query = query.where('lostMode', '==', filters.lostMode);
    }

    const snapshot = await query.get();
    const devices = [];
    snapshot.forEach(doc => {
      devices.push(new Device({ id: doc.id, ...doc.data() }));
    });

    return devices;
  }

  static async findOnline() {
    return Device.findAll({ isOnline: true });
  }

  static async findOffline() {
    return Device.findAll({ isOnline: false });
  }

  async update(data) {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    delete updateData.id;
    
    await Device.collection().doc(this.id).update(updateData);
    Object.assign(this, data);
    this.updatedAt = new Date();
    return this;
  }

  async delete() {
    await Device.collection().doc(this.id).update({
      status: 'deleted',
      updatedAt: new Date()
    });
    this.status = 'deleted';
    return true;
  }

  async setOnline() {
    await this.update({
      isOnline: true,
      networkStatus: 'online',
      lastOnline: new Date()
    });
  }

  async setOffline() {
    await this.update({
      isOnline: false,
      networkStatus: 'offline',
      lastOnline: new Date()
    });
  }

  async setLostMode() {
    await this.update({
      lostMode: true,
      status: 'lost'
    });
  }

  async disableLostMode() {
    await this.update({
      lostMode: false,
      status: 'active'
    });
  }

  toJSON() {
    return {
      id: this.id,
      deviceName: this.deviceName,
      deviceId: this.deviceId,
      brand: this.brand,
      model: this.model,
      androidVersion: this.androidVersion,
      battery: this.battery,
      storage: this.storage,
      ram: this.ram,
      networkStatus: this.networkStatus,
      lastOnline: this.lastOnline,
      userId: this.userId,
      status: this.status,
      lostMode: this.lostMode,
      isOnline: this.isOnline,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata
    };
  }
}

module.exports = Device;
