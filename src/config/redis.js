// src/config/redis.js
const redis = require('redis');

class RedisConfig {
  constructor() {
    this.client = null;
    this.connected = false;  // Gunakan ini sebagai flag
    this.initialize();
  }

  initialize() {
    try {
      const redisUrl = process.env.REDIS_URL;

      // Jika tidak ada Redis URL, skip
      if (!redisUrl) {
        console.warn('⚠️ REDIS_URL not set, using in-memory fallback');
        this.connected = false;
        return;
      }

      this.client = redis.createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 5) {
              console.warn('⚠️ Redis max retries reached, using in-memory fallback');
              this.connected = false;
              return new Error('Redis max retries reached');
            }
            return Math.min(retries * 100, 3000);
          },
          connectTimeout: 5000
        }
      });

      this.client.on('connect', () => {
        this.connected = true;
        console.log('🔴 Redis connected successfully');
      });

      this.client.on('error', (err) => {
        this.connected = false;
        console.error('❌ Redis error:', err.message);
      });

      this.client.on('end', () => {
        this.connected = false;
        console.warn('⚠️ Redis connection closed');
      });

      // Connect
      this.client.connect().catch((err) => {
        console.error('❌ Redis connection failed:', err.message);
        this.connected = false;
      });

    } catch (error) {
      console.error('❌ Redis initialization error:', error.message);
      this.connected = false;
    }
  }

  // Method untuk cek koneksi
  isConnected() {
    return this.connected && this.client !== null;
  }

  async getCache(key) {
    if (!this.isConnected() || !this.client) return null;
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis getCache error:', error.message);
      return null;
    }
  }

  async setCache(key, value, ttl = 3600) {
    if (!this.isConnected() || !this.client) return false;
    try {
      await this.client.set(key, JSON.stringify(value), { EX: ttl });
      return true;
    } catch (error) {
      console.error('Redis setCache error:', error.message);
      return false;
    }
  }

  async deleteCache(key) {
    if (!this.isConnected() || !this.client) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis deleteCache error:', error.message);
      return false;
    }
  }

  async setUserSession(userId, sessionData, ttl = 604800) {
    return this.setCache(`session:${userId}`, sessionData, ttl);
  }

  async getUserSession(userId) {
    return this.getCache(`session:${userId}`);
  }

  async deleteUserSession(userId) {
    return this.deleteCache(`session:${userId}`);
  }

  async setUserOnline(userId) {
    if (!this.isConnected() || !this.client) return;
    try {
      await this.client.sAdd('online_users', userId);
      await this.client.expire('online_users', 300);
    } catch (error) {
      console.error('Redis setUserOnline error:', error.message);
    }
  }

  async setUserOffline(userId) {
    if (!this.isConnected() || !this.client) return;
    try {
      await this.client.sRem('online_users', userId);
    } catch (error) {
      console.error('Redis setUserOffline error:', error.message);
    }
  }

  async getOnlineUsers() {
    if (!this.isConnected() || !this.client) return [];
    try {
      return await this.client.sMembers('online_users');
    } catch (error) {
      console.error('Redis getOnlineUsers error:', error.message);
      return [];
    }
  }

  getClient() {
    return this.client;
  }
}

module.exports = new RedisConfig();
