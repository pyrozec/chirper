const twilioClient = require('../api/twilioClient');
const scheduler = require('../utils/scheduler');
const db = require('../database/db');
const redis = require('../utils/redis');
const helpers = require('../utils/helpers');
const logger = require('../utils/logger');
const config = require('../config/env');
const constants = require('../config/constants');
const bot = require('./bot');
const fs = require('fs').promises;
const path = require('path');

const fetchTemplateMessage = async (userId, templateName) => {
  if (!templateName) return null;

  let template = await db.get(
    `SELECT message FROM message_templates WHERE user_id = ? AND name = ?`,
    [userId, templateName]
  );

  if (!template) {
    template = await db.get(
      `SELECT message FROM message_templates WHERE name = ? AND shared_with LIKE ?`,
      [templateName, `%${userId}%`]
    );
  }

  return template ? template.message : null;
};

const fetchDefaultTemplateMessage = async (userId) => {
  const user = await db.get(
    `SELECT default_template FROM users WHERE telegram_id = ?`,
    [userId]
  );
  if (!user || !user.default_template) return null;

  return fetchTemplateMessage(userId, user.default_template);
};

const parseMessageAndOptions = async (args, supportedLanguages, supportedPlatforms, userId) => {
  let message = null;
  let language = 'en';
  let templateName = null;
  let vars = {};
  let platform = null;

  if (args.length > 0 && supportedPlatforms.includes(args[args.length - 1])) {
    platform = args[args.length - 1];
    args.pop();
  }

  const templateIndex = args.indexOf('--template');
  if (templateIndex !== -1 && templateIndex + 1 < args.length) {
    templateName = args[templateIndex + 1];
    args.splice(templateIndex, 2);
  }

  const varsIndex = args.indexOf('--vars');
  if (varsIndex !== -1 && varsIndex + 1 < args.length) {
    const varsStr = args.slice(varsIndex + 1).join(' ');
    args.splice(varsIndex, args.length - varsIndex);
    const varsPairs = varsStr.match(/(\w+)=([^ ]+)/g) || [];
    varsPairs.forEach((pair) => {
      const [key, value] = pair.split('=');
      vars[key] = value;
    });
  }

  if (args.length > 0 && supportedLanguages.includes(args[args.length - 1])) {
    language = args[args.length - 1];
    args.pop();
  }

  if (args.length > 0) {
    message = args.join(' ');
  }

  if (templateName) {
    const templateMessage = await fetchTemplateMessage(userId, templateName);
    if (!templateMessage) {
      throw new Error(`Template "${templateName}" not found. Use /template list to see available templates.`);
    }
    message = templateMessage;
  }

  if (!message && !templateName && !platform) {
    message = await fetchDefaultTemplateMessage(userId);
    if (!message) {
      message = null;
    }
  }

  if (message && Object.keys(vars).length > 0) {
    Object.keys(vars).forEach((key) => {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, 'g'), vars[key]);
    });
  }

  return { message, language, templateName, vars, platform };
};

const start = async (ctx) => {
  await ctx.reply(
    'Welcome! Commands:\n' +
    '/call  [message | --template  [--vars key=value ...]] [language | platform]\n' +
    '/schedule   [recurrence] [message | --template  [--vars key=value ...]] [language | platform]\n' +
    '/cancel \n' +
    '/reschedule  \n' +
    '/status \n' +
    '/broadcast [message | --template  [--vars key=value ...]] [language]\n' +
    '/template add/remove/list/share/unshare/setdefault  [category] [message] [share_with]\n' +
    '/stats\n' +
    '/retry \n' +
    '/history [page]\n' +
    '/recordings \n' +
    '/setlanguage \n' +
    'Supported platforms: paypal, google, snapchat, instagram'
  );
};

const makeCall = async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  const phoneNumber = args.shift();

  if (!phoneNumber || !helpers.validatePhoneNumber(phoneNumber)) {
    await ctx.reply('Please provide a valid phone number in E.164 format (e.g., +3312345678).');
    return;
  }

  try {
    const { message, language, platform } = await parseMessageAndOptions(
      args,
      config.languages.supported,
      Object.keys(constants.SUPPORTED_PLATFORMS),
      ctx.from.id
    );

    if (!message && !platform) {
      await ctx.reply('Please provide a message, specify a template, set a default template, or specify a platform.');
      return;
    }

    const callData = {
      type: 'immediate',
      call: { phoneNumber, message, language, platform, userId: ctx.from.id }
    };
    await redis.enqueueCall(callData);
    await ctx.reply(`Call to ${phoneNumber} queued for processing...`);
  } catch (error) {
    logger.error(`Failed to queue call: ${error.message}`, { phoneNumber });
    await ctx.reply(error.message);
  }
};

const scheduleCall = async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  const phoneNumber = args.shift();
  const scheduleTime = args.shift();

  if (!phoneNumber || !helpers.validatePhoneNumber(phoneNumber)) {
    await ctx.reply('Please provide a valid phone number in E.164 format (e.g., +3312345678).');
    return;
  }

  if (!scheduleTime || isNaN(new Date(scheduleTime).getTime())) {
    await ctx.reply('Please provide a valid ISO date/time (e.g., 2023-10-10T10:00:00).');
    return;
  }

  const recurrence = ['none', 'daily', 'weekly'].includes(args[0]) ? args.shift() : 'none';

  try {
    const { message, language, platform } = await parseMessageAndOptions(
      args,
      config.languages.supported,
      Object.keys(constants.SUPPORTED_PLATFORMS),
      ctx.from.id
    );

    if (!message && !platform) {
      await ctx.reply('Please provide a message, specify a template, set a default template, or specify a platform.');
      return;
    }

    const callId = await scheduler.scheduleCall(phoneNumber, message, scheduleTime, recurrence, ctx.from.id, platform);
    await ctx.reply(`Call scheduled to ${phoneNumber} at ${scheduleTime} (ID: ${callId}).`);
  } catch (error) {
    logger.error(`Failed to schedule call: ${error.message}`, { phoneNumber, scheduleTime });
    await ctx.reply(error.message);
  }
};

const broadcast = async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);

  try {
    const { message, language } = await parseMessageAndOptions(
      args,
      config.languages.supported,
      Object.keys(constants.SUPPORTED_PLATFORMS),
      ctx.from.id
    );

    if (!message) {
      await ctx.reply('Please provide a message, specify a template, or set a default template.');
      return;
    }

    const phoneNumbers = ['+1234567890', '+0987654321'];
    if (!phoneNumbers.length) {
      await ctx.reply('No phone numbers available for broadcast.');
      return;
    }

    for (const phoneNumber of phoneNumbers) {
      await redis.enqueueCall({
        type: 'immediate',
        call: { phoneNumber, message, language, userId: ctx.from.id }
      });
    }

    await ctx.reply(`Broadcast queued for ${phoneNumbers.length} numbers.`);
  } catch (error) {
    logger.error(`Failed to queue broadcast: ${error.message}`);
    await ctx.reply(error.message);
  }
};

const cancelSchedule = async (ctx) => {
  const callId = ctx.message.text.split(' ')[1];
  if (!callId) {
    await ctx.reply('Please provide a schedule ID.');
    return;
  }

  try {
    await scheduler.cancelScheduledCall(callId, ctx.from.id);
  } catch (error) {
    logger.error(`Failed to cancel schedule: ${error.message}`, { callId });
    await ctx.reply(error.message);
  }
};

const rescheduleCall = async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  const callId = args[0];
  const newTime = args[1];

  if (!callId || !newTime || isNaN(new Date(newTime).getTime())) {
    await ctx.reply('Please provide a valid schedule ID and new ISO date/time (e.g., /reschedule 1 2023-10-10T10:00:00).');
    return;
  }

  try {
    await scheduler.rescheduleCall(callId, newTime, ctx.from.id);
  } catch (error) {
    logger.error(`Failed to reschedule call: ${error.message}`, { callId, newTime });
    await ctx.reply(error.message);
  }
};

const checkStatus = async (ctx) => {
  const callId = ctx.message.text.split(' ')[1];
  if (!callId) {
    await ctx.reply('Please provide a call ID.');
    return;
  }

  const scheduledCall = await db.get(`SELECT * FROM scheduled_calls WHERE id = ? AND user_id = ?`, [callId, ctx.from.id]);
  const historyCall = await db.get(`SELECT * FROM call_history WHERE id = ? AND user_id = ?`, [callId, ctx.from.id]);

  if (scheduledCall) {
    await ctx.reply(`Scheduled Call (ID: ${callId}): Status: ${scheduledCall.status}, Time: ${scheduledCall.schedule_time}, To: ${scheduledCall.phone_number}`);
  } else if (historyCall) {
    await ctx.reply(`Immediate Call (ID: ${callId}): Status: ${historyCall.status}, Time: ${historyCall.timestamp}, To: ${historyCall.phone_number}`);
  } else {
    await ctx.reply('Call not found.');
  }
};

const manageTemplate = async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  const action = args[0];
  const name = args[1];
  let category = 'default';
  let message = null;
  let shareWith = '';

  if (!action || !['add', 'remove', 'list', 'share', 'unshare', 'setdefault'].includes(action)) {
    await ctx.reply('Please specify an action: add, remove, list, share, unshare, setdefault');
    return;
  }

  if (action === 'add') {
    if (!name) {
      await ctx.reply('Please provide a name: /template add  [category] ');
      return;
    }

    const reservedFlags = ['--vars', '--template'];
    if (args[2] && !reservedFlags.includes(args[2])) {
      category = args[2];
      message = args.slice(3).join(' ');
    } else {
      message = args.slice(2).join(' ');
    }

    if (!message) {
      await ctx.reply('Please provide a message: /template add  [category] ');
      return;
    }

    await db.run(
      `INSERT OR REPLACE INTO message_templates (user_id, name, category, message) VALUES (?, ?, ?, ?)`,
      [ctx.from.id, name, category, message]
    );
    await ctx.reply(`Template "${name}" added in category "${category}".`);
  } else if (action === 'remove') {
    if (!name) {
      await ctx.reply('Please provide a template name: /template remove ');
      return;
    }
    await db.run(
      `DELETE FROM message_templates WHERE user_id = ? AND name = ?`,
      [ctx.from.id, name]
    );
    const user = await db.get(`SELECT default_template FROM users WHERE telegram_id = ?`, [ctx.from.id]);
    if (user && user.default_template === name) {
      await db.run(`UPDATE users SET default_template = NULL WHERE telegram_id = ?`, [ctx.from.id]);
    }
    await ctx.reply(`Template "${name}" removed.`);
  } else if (action === 'list') {
    const categoryFilter = args[1] ? `WHERE category = ?` : '';
    const params = categoryFilter ? [args[1]] : [];
    const templates = await db.all(
      `SELECT * FROM message_templates WHERE user_id = ? ${categoryFilter}`,
      [ctx.from.id, ...params]
    );

    const sharedTemplates = await db.all(
      `SELECT * FROM message_templates WHERE shared_with LIKE ?`,
      [`%${ctx.from.id}%`]
    );

    if (!templates.length && !sharedTemplates.length) {
      await ctx.reply('No templates found.');
      return;
    }

    const ownTemplatesList = templates.length
      ? templates.map((t) => `[${t.category}] ${t.name}: ${t.message}`).join('\n')
      : 'None';
    const sharedTemplatesList = sharedTemplates.length
      ? sharedTemplates.map((t) => `[Shared][${t.category}] ${t.name}: ${t.message}`).join('\n')
      : 'None';

    await ctx.reply(
      `Your Templates:\n${ownTemplatesList}\n\nShared with You:\n${sharedTemplatesList}`
    );
  } else if (action === 'share') {
    if (!name || !args[2]) {
      await ctx.reply('Please provide a template name and user IDs: /template share  ');
      return;
    }
    const shareWithIds = args[2].split(',').map(Number);
    if (!shareWithIds.every(id => config.telegram.authorizedUsers.includes(id))) {
      await ctx.reply('One or more user IDs are not authorized.');
      return;
    }

    const template = await db.get(
      `SELECT shared_with FROM message_templates WHERE user_id = ? AND name = ?`,
      [ctx.from.id, name]
    );
    if (!template) {
      await ctx.reply(`Template "${name}" not found.`);
      return;
    }

    const currentSharedWith = template.shared_with ? template.shared_with.split(',').map(Number) : [];
    const updatedSharedWith = [...new Set([...currentSharedWith, ...shareWithIds])].join(',');
    await db.run(
      `UPDATE message_templates SET shared_with = ? WHERE user_id = ? AND name = ?`,
      [updatedSharedWith, ctx.from.id, name]
    );
    await ctx.reply(`Template "${name}" shared with users: ${shareWithIds.join(', ')}`);
  } else if (action === 'unshare') {
    if (!name || !args[2]) {
      await ctx.reply('Please provide a template name and user IDs: /template unshare  ');
      return;
    }
    const unshareIds = args[2].split(',').map(Number);
    const template = await db.get(
      `SELECT shared_with FROM message_templates WHERE user_id = ? AND name = ?`,
      [ctx.from.id, name]
    );
    if (!template) {
      await ctx.reply(`Template "${name}" not found.`);
      return;
    }

    const currentSharedWith = template.shared_with ? template.shared_with.split(',').map(Number) : [];
    const updatedSharedWith = currentSharedWith
      .filter(id => !unshareIds.includes(id))
      .join(',');
    await db.run(
      `UPDATE message_templates SET shared_with = ? WHERE user_id = ? AND name = ?`,
      [updatedSharedWith, ctx.from.id, name]
    );
    await ctx.reply(`Template "${name}" unshared from users: ${unshareIds.join(', ')}`);
  } else if (action === 'setdefault') {
    if (!name) {
      await ctx.reply('Please provide a template name: /template setdefault ');
      return;
    }
    const template = await db.get(
      `SELECT * FROM message_templates WHERE user_id = ? AND name = ?`,
      [ctx.from.id, name]
    );
    if (!template) {
      await ctx.reply(`Template "${name}" not found.`);
      return;
    }

    await db.run(
      `INSERT OR REPLACE INTO users (telegram_id, default_template) VALUES (?, ?)`,
      [ctx.from.id, name]
    );
    await ctx.reply(`Default template set to "${name}".`);
  }
};

const viewStats = async (ctx) => {
  const totalCalls = (await db.all(`SELECT * FROM call_history WHERE user_id = ?`, [ctx.from.id])).length;
  const successfulCalls = (await db.all(`SELECT * FROM call_history WHERE user_id = ? AND status = 'completed'`, [ctx.from.id])).length;
  const scheduledCalls = (await db.all(`SELECT * FROM scheduled_calls WHERE user_id = ? AND status = 'pending'`, [ctx.from.id])).length;

  const stats = `
    Total Calls: ${totalCalls}
    Successful Calls: ${successfulCalls}
    Success Rate: ${totalCalls ? ((successfulCalls / totalCalls) * 100).toFixed(2) : 0}%
    Pending Scheduled Calls: ${scheduledCalls}
  `;
  await ctx.reply(stats);
};

const retryCall = async (ctx) => {
  const callId = ctx.message.text.split(' ')[1];
  if (!callId) {
    await ctx.reply('Please provide a call ID.');
    return;
  }

  const historyCall = await db.get(`SELECT * FROM call_history WHERE id = ? AND user_id = ? AND status = 'failed'`, [callId, ctx.from.id]);
  if (!historyCall) {
    await ctx.reply('Failed call not found or not authorized.');
    return;
  }

  try {
    await redis.enqueueCall({
      type: 'immediate',
      call: { phoneNumber: historyCall.phone_number, message: null, language: 'en', userId: ctx.from.id }
    });
    await ctx.reply(`Retry call to ${historyCall.phone_number} queued for processing...`);
  } catch (error) {
    logger.error(`Failed to retry call: ${error.message}`, { callId });
    await ctx.reply('Failed to retry call. Please try again later.');
  }
};

const viewHistory = async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  const page = parseInt(args[0]) || 1;
  const limit = 5;
  const offset = (page - 1) * limit;

  const history = await db.all(
    `SELECT * FROM call_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
    [ctx.from.id, limit, offset]
  );
  const total = (await db.all(`SELECT * FROM call_history WHERE user_id = ?`, [ctx.from.id])).length;

  if (!history.length) {
    await ctx.reply('No call history found.');
    return;
  }

  const historyText = history.map((entry) => (
    `ID: ${entry.id}, To: ${entry.phone_number}, Status: ${entry.status}, Time: ${entry.timestamp}`
  )).join('\n');
  const totalPages = Math.ceil(total / limit);
  await ctx.reply(`Call History (Page ${page}/${totalPages}):\n${historyText}`);
};

const viewRecordings = async (ctx) => {
  const callId = ctx.message.text.split(' ')[1];
  if (!callId) {
    await ctx.reply('Please provide a call ID.');
    return;
  }

  const historyCall = await db.get(`SELECT * FROM call_history WHERE id = ? AND user_id = ?`, [callId, ctx.from.id]);
  if (!historyCall || !historyCall.recording_url) {
    await ctx.reply('Recording not found for this call.');
    return;
  }

  await ctx.reply(`Recording URL: ${historyCall.recording_url}`);
};

const setLanguage = async (ctx) => {
  const language = ctx.message.text.split(' ')[1];
  if (!language || !config.languages.supported.includes(language)) {
    await ctx.reply(`Please provide a valid language code. Supported languages: ${config.languages.supported.join(', ')}`);
    return;
  }

  await db.run(
    `INSERT OR REPLACE INTO users (telegram_id, preferred_language) VALUES (?, ?)`,
    [ctx.from.id, language]
  );
  await ctx.reply(`Preferred language set to ${language}.`);
};

module.exports = {
  start,
  makeCall,
  scheduleCall,
  cancelSchedule,
  rescheduleCall,
  checkStatus,
  broadcast,
  manageTemplate,
  viewStats,
  retryCall,
  viewHistory,
  viewRecordings,
  setLanguage,
};
