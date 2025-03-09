const config = require('../config/env');
const logger = require('../utils/logger');

module.exports = async (ctx, next) => {
  const userId = ctx.from.id;

  if (!config.telegram.authorizedUsers.includes(userId)) {
    await ctx.reply('You are not authorized to use this bot.');
    logger.warn(`Unauthorized access attempt by user ${userId}`);
    return;
  }

  await next();
};