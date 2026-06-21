const redis = require('redis');
const { promisify } = require('util');

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

      this.client = redis.createClient({
        url: redisUrl,
        password: process.env.REDIS_PASSWORD,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('❌ Redis connection refused');
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return new Error('Max retries exceeded');
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log('🔴 Redis connected successfully');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        console.error('❌ Redis error:', err);
      });

      this.client.on('end', () => {
        this.isConnected = false;
        console.warn('⚠️ Redis connection closed');
      });

      // Promisify methods
      this.get = promisify(this.client.get).bind(this.client);
      this.set = promisify(this.client.set).bind(this.client);
      this.del = promisify(this.client.del).bind(this.client);
      this.hget = promisify(this.client.hget).bind(this.client);
      this.hset = promisify(this.client.hset).bind(this.client);
      this.hdel = promisify(this.client.hdel).bind(this.client);
      this.hgetall = promisify(this.client.hgetall).bind(this.client);
      this.lpush = promisify(this.client.lpush).bind(this.client);
      this.rpush = promisify(this.client.rpush).bind(this.client);
      this.lpop = promisify(this.client.lpop).bind(this.client);
      this.rpop = promisify(this.client.rpop).bind(this.client);
      this.lrange = promisify(this.client.lrange).bind(this.client);
      this.llen = promisify(this.client.llen).bind(this.client);
      this.sadd = promisify(this.client.sadd).bind(this.client);
      this.srem = promisify(this.client.srem).bind(this.client);
      this.sismember = promisify(this.client.sismember).bind(this.client);
      this.smembers = promisify(this.client.smembers).bind(this.client);
      this.expire = promisify(this.client.expire).bind(this.client);
      this.ttl = promisify(this.client.ttl).bind(this.client);
      this.keys = promisify(this.client.keys).bind(this.client);
      this.flushall = promisify(this.client.flushall).bind(this.client);

    } catch (error) {
      console.error('❌ Redis initialization error:', error);
    }
  }

  async setCache(key, value, ttl = 3600) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await this.set(key, stringValue);
      if (ttl > 0) {
        await this.expire(key, ttl);
      }
      return true;
    } catch (error) {
      console.error('Redis setCache error:', error);
      return false;
    }
  }

  async getCache(key) {
    try {
      const value = await this.get(key);
      if (value) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return null;
    } catch (error) {
      console.error('Redis getCache error:', error);
      return null;
    }
  }

  async deleteCache(key) {
    try {
      await this.del(key);
      return true;
    } catch (error) {
      console.error('Redis deleteCache error:', error);
      return false;
    }
  }

  async flushCache() {
    try {
      await this.flushall();
      return true;
    } catch (error) {
      console.error('Redis flushCache error:', error);
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

  async setUserToken(userId, token, ttl = 900) {
    return this.setCache(`token:${userId}`, token, ttl);
  }

  async getUserToken(userId) {
    return this.getCache(`token:${userId}`);
  }

  async deleteUserToken(userId) {
    return this.deleteCache(`token:${userId}`);
  }

  async setRefreshToken(userId, refreshToken, ttl = 604800) {
    return this.setCache(`refresh:${userId}`, refreshToken, ttl);
  }

  async getRefreshToken(userId) {
    return this.getCache(`refresh:${userId}`);
  }

  async deleteRefreshToken(userId) {
    return this.deleteCache(`refresh:${userId}`);
  }

  async getOnlineUsers() {
    return this.smembers('online_users');
  }

  async setUserOnline(userId) {
    await this.sadd('online_users', userId);
    await this.expire('online_users', 300);
  }

  async setUserOffline(userId) {
    await this.srem('online_users', userId);
  }

  isConnected() {
    return this.isConnected;
  }

  getClient() {
    return this.client;
  }
}

module.exports = new RedisConfig();
