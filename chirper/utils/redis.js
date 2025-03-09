const Redis = require('ioredis');
const config = require('../config/env');
const logger = require('./logger');

class RedisClient {
  constructor() {
    this.client = new Redis(config.redis.url);
    this.client.on('error', (err) => logger.error(`Redis error: ${err.message}`));
    this.client.on('connect', () => logger.info('Connected to Redis'));
  }

  async enqueueCall(callData) {
    await this.client.lpush('callQueue', JSON.stringify(callData));
  }

  async dequeueCall() {
    const call = await this.client.rpop('callQueue');
    return call ? JSON.parse(call) : null;
  }

  async setCache(key, value, ttl = 3600) {
    await this.client.setex(key, ttl, JSON.stringify(value));
  }

  async getCache(key) {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }
}

module.exports = new RedisClient();