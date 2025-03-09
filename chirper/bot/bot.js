const { Bot } = require('grammy');
const config = require('../config/env');
const handlers = require('./handlers');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

const bot = new Bot(config.telegram.botToken);

bot.use(auth);
bot.use(rateLimiter);

bot.command('start', handlers.start);
bot.command('call', handlers.makeCall);
bot.command('schedule', handlers.scheduleCall);
bot.command('cancel', handlers.cancelSchedule);
bot.command('reschedule', handlers.rescheduleCall);
bot.command('status', handlers.checkStatus);
bot.command('broadcast', handlers.broadcast);
bot.command('template', handlers.manageTemplate);
bot.command('stats', handlers.viewStats);
bot.command('retry', handlers.retryCall);
bot.command('history', handlers.viewHistory);
bot.command('recordings', handlers.viewRecordings);
bot.command('setlanguage', handlers.setLanguage);

bot.on('message:audio', async (ctx) => {
  const file = await ctx.getFile();
  const filePath = path.join(__dirname, '..', '..', 'public', `${file.file_id}.mp3`);
  await file.download(filePath);
  await ctx.reply(`Audio file uploaded. Use it in a call with: /call <phone_number> --audio ${file.file_id}`);
});

bot.catch((err) => {
  logger.error(`Bot error: ${err.message}`, { stack: err.stack });
});

module.exports = bot;