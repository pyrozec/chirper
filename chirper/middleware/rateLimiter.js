const { limit } = require('@grammyjs/ratelimiter'); // Correct import
const redis = require('../utils/redis');
const logger = require('../utils/logger');

class RateLimiter {
  constructor() {
    this.limiter = limit({
      timeFrame: 15 * 60 * 1000, // 15 minutes
      limit: 100, // Max requests per time frame
      storageClient: redis.client, // Use Redis for storing rate limits
      keyGenerator: (ctx) => `${ctx.from.id}:${ctx.message?.text?.split(' ')[0]?.replace('/', '') || 'default'}`,
      onLimitExceeded: async (ctx) => {
        await ctx.reply(`Too many requests! Please slow down.`);
        logger.warn(`Rate limit exceeded for user ${ctx.from.id}`);
      },
    });
  }

  getMiddleware() {
    return this.limiter;
  }
}

module.exports = new RateLimiter().getMiddleware();
