const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');

class FirebaseConfig {
  constructor() {
    this.initialize();
  }

  initialize() {
    try {
      if (admin.apps.length === 0) {
        const serviceAccount = {
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        };

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL
        });

        console.log('🔥 Firebase initialized successfully');
      }
    } catch (error) {
      console.error('❌ Firebase initialization error:', error);
      throw error;
    }
  }

  getAdmin() {
    return admin;
  }

  getAuth() {
    return getAuth();
  }

  getFirestore() {
    return getFirestore();
  }

  getMessaging() {
    return getMessaging();
  }
}

module.exports = new FirebaseConfig();
