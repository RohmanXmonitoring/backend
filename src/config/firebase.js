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

      // Handle private key properly
      if (privateKey) {
        // Remove quotes if present
        privateKey = privateKey.replace(/^"|"$/g, '');
        // Replace escaped newlines
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      // Validate required fields
      if (!projectId || !clientEmail || !privateKey) {
        console.error('❌ Missing Firebase credentials in environment variables');
        console.error('Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
        
        // Use mock for development if needed
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Running in development mode without Firebase');
          this.initialized = true;
          return;
        }
        throw new Error('Firebase credentials are required');
      }

      // Initialize Firebase
      const serviceAccount = {
        projectId,
        clientEmail,
        privateKey
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${projectId}.firebaseio.com`
      });

      this.initialized = true;
      console.log('🔥 Firebase initialized successfully');

    } catch (error) {
      console.error('❌ Firebase initialization error:', error.message);
      if (process.env.NODE_ENV === 'production') {
        console.error('Firebase is required in production mode');
        process.exit(1);
      }
      this.initialized = false;
    }
  }

  getAdmin() {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }
    return admin;
  }

  getAuth() {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }
    return admin.auth();
  }

  getFirestore() {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }
    return admin.firestore();
  }

  getMessaging() {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }
    return admin.messaging();
  }

  isInitialized() {
    return this.initialized;
  }
}

module.exports = new FirebaseConfig();
