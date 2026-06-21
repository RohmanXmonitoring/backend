const { getFirestore } = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');

class Setting {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.key = data.key || '';
    this.value = data.value || null;
    this.type = data.type || 'string';
    this.category = data.category || 'general';
    this.isPublic = data.isPublic || false;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.metadata = data.metadata || {};
  }

  static collection() {
    return getFirestore().collection('settings');
  }

  static async create(settingData) {
    const setting = new Setting(settingData);
    const settingDataPlain = { ...setting };
    delete settingDataPlain.id;
    
    await Setting.collection().doc(setting.id).set({
      ...settingDataPlain,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return setting;
  }

  static async findById(id) {
    const doc = await Setting.collection().doc(id).get();
    if (!doc.exists) return null;
    return new Setting({ id: doc.id, ...doc.data() });
  }

  static async findByKey(key) {
    const snapshot = await Setting.collection()
      .where('key', '==', key)
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return new Setting({ id: doc.id, ...doc.data() });
  }

  static async findAll(filters = {}, options = {}) {
    let query = Setting.collection();

    if (filters.category) {
      query = query.where('category', '==', filters.category);
    }
    if (filters.isPublic !== undefined) {
      query = query.where('isPublic', '==', filters.isPublic);
    }

    const snapshot = await query.get();
    const settings = [];
    snapshot.forEach(doc => {
      settings.push(new Setting({ id: doc.id, ...doc.data() }));
    });

    return settings;
  }

  static async getPublicSettings() {
    return Setting.findAll({ isPublic: true });
  }

  static async getValue(key, defaultValue = null) {
    const setting = await Setting.findByKey(key);
    return setting ? setting.value : defaultValue;
  }

  async update(data) {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    delete updateData.id;
    
    await Setting.collection().doc(this.id).update(updateData);
    Object.assign(this, data);
    this.updatedAt = new Date();
    return this;
  }

  async delete() {
    await Setting.collection().doc(this.id).delete();
    return true;
  }

  getTypedValue() {
    switch (this.type) {
      case 'number':
        return Number(this.value);
      case 'boolean':
        return this.value === 'true' || this.value === true;
      case 'json':
        try {
          return JSON.parse(this.value);
        } catch {
          return this.value;
        }
      default:
        return this.value;
    }
  }

  toJSON() {
    return {
      id: this.id,
      key: this.key,
      value: this.getTypedValue(),
      type: this.type,
      category: this.category,
      isPublic: this.isPublic,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata
    };
  }
}

module.exports = Setting;
