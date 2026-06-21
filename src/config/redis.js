// src/config/redis.js
const redis = require('redis');

class RedisConfig {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.initialize();
  }

  initialize() {
    try {
      const redisUrl = process.env.REDIS_URL || 
        `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

      // Skip Redis in Railway if not configured
      if (process.env.RAILWAY_STATIC_URL && !process.env.REDIS_URL) {
        console.warn('⚠️ Redis not configured on Railway, using in-memory fallback');
        this.isConnected = false;
        return;
      }

      this.client = redis.createClient({
        url: redisUrl,
        password: process.env.REDIS_PASSWORD,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis max retries reached');
              return new Error('Redis max retries reached');
            }
            return Math.min(retries * 100, 3000);
          },
          connectTimeout: 5000,
          keepAlive: 30000
        }
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log('🔴 Redis connected successfully');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        console.error('❌ Redis error:', err.message);
      });

      this.client.on('end', () => {
        this.isConnected = false;
        console.warn('⚠️ Redis connection closed');
      });

      // Connect
      this.client.connect().catch((err) => {
        console.error('❌ Redis connection failed:', err.message);
        this.isConnected = false;
      });

    } catch (error) {
      console.error('❌ Redis initialization error:', error.message);
      this.isConnected = false;
    }
  }

  async getCache(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }
    try {
      const value = await this.client.get(key);
      if (value) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return null;
    } catch (error) {
      console.error('Redis getCache error:', error.message);
      return null;
    }
  }

  async setCache(key, value, ttl = 3600) {
    if (!this.isConnected || !this.client) {
      return false;
    }
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await this.client.set(key, stringValue, {
        EX: ttl
      });
      return true;
    } catch (error) {
      console.error('Redis setCache error:', error.message);
      return false;
    }
  }

  async deleteCache(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }
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
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.sAdd('online_users', userId);
      await this.client.expire('online_users', 300);
    } catch (error) {
      console.error('Redis setUserOnline error:', error.message);
    }
  }

  async setUserOffline(userId) {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.sRem('online_users', userId);
    } catch (error) {
      console.error('Redis setUserOffline error:', error.message);
    }
  }

  async getOnlineUsers() {
    if (!this.isConnected || !this.client) {
      return [];
    }
    try {
      return await this.client.sMembers('online_users');
    } catch (error) {
      console.error('Redis getOnlineUsers error:', error.message);
      return [];
    }
  }

  isConnected() {
    return this.isConnected;
  }

  getClient() {
    return this.client;
  }
}

module.exports = new RedisConfig();
