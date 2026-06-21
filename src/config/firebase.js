// src/config/firebase.js
const admin = require('firebase-admin');

class FirebaseConfig {
  constructor() {
    this.initialized = false;
    this.initialize();
  }

  initialize() {
    try {
      // Check if already initialized
      if (admin.apps.length > 0) {
        this.initialized = true;
        console.log('🔥 Firebase already initialized');
        return;
      }

      // Get credentials from environment
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      // Jika tidak ada credentials, gunakan mock
      if (!projectId || !clientEmail || !privateKey) {
        console.warn('⚠️ Firebase credentials not found, using mock mode');
        console.warn('Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
        this.initialized = false;
        return;
      }

      // Initialize Firebase
      const serviceAccount = {
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n')
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${projectId}.firebaseio.com`
      });

      this.initialized = true;
      console.log('🔥 Firebase initialized successfully');

    } catch (error) {
      console.error('❌ Firebase initialization error:', error.message);
      this.initialized = false;
    }
  }

  isInitialized() {
    return this.initialized;
  }

  getAdmin() {
    return this.initialized ? admin : null;
  }

  getAuth() {
    return this.initialized ? admin.auth() : null;
  }

  getFirestore() {
    return this.initialized ? admin.firestore() : null;
  }

  getMessaging() {
    return this.initialized ? admin.messaging() : null;
  }
}

module.exports = new FirebaseConfig();
