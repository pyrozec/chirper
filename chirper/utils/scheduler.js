const schedule = require('node-schedule');
const twilioClient = require('../api/twilioClient');
const db = require('../database/db');
const redis = require('../utils/redis');
const logger = require('../utils/logger');

// const bot = require('../bot/bot');

let bot;
setTimeout(() => {
  bot = require('../bot/bot');
}, 0);

class CallScheduler {
  constructor() {
    this.jobs = new Map();
    this.startScheduler();
    this.startQueueProcessor();
  }

  startScheduler() {
    schedule.scheduleJob('*/1 * * * *', async () => {
      try {
        const now = new Date().toISOString();
        const pendingCalls = await db.all(
          `SELECT * FROM scheduled_calls WHERE schedule_time <= ? AND status = 'pending'`,
          [now]
        );

        for (const call of pendingCalls) {
          await redis.enqueueCall({ type: 'scheduled', call });
        }
      } catch (error) {
        logger.error(`Scheduler error: ${error.message}`);
      }
    });
    logger.info('Call scheduler started');
  }

  startQueueProcessor() {
    setInterval(async () => {
      const callData = await redis.dequeueCall();
      if (callData) {
        if (callData.type === 'scheduled') {
          await this.executeScheduledCall(callData.call);
        } else if (callData.type === 'immediate') {
          await this.executeImmediateCall(callData.call);
        }
      }
    }, 1000);
    logger.info('Queue processor started');
  }

  async scheduleCall(phoneNumber, message, scheduleTime, recurrence = 'none', userId, platform = null) {
    const formattedTime = new Date(scheduleTime).toISOString();
    const result = await db.run(
      `INSERT INTO scheduled_calls (phone_number, message, schedule_time, recurrence, user_id) VALUES (?, ?, ?, ?, ?)`,
      [phoneNumber, message, formattedTime, recurrence, userId]
    );
    const callId = result.lastID;

    await bot.api.sendMessage(userId, `Call scheduled to ${phoneNumber} at ${formattedTime} (ID: ${callId}).`);

    if (recurrence !== 'none') {
      this.scheduleRecurringCall(callId, phoneNumber, message, scheduleTime, recurrence, userId, platform);
    }

    logger.info(`Scheduled call to ${phoneNumber} at ${formattedTime} (ID: ${callId})`);
    return callId;
  }

  scheduleRecurringCall(callId, phoneNumber, message, scheduleTime, recurrence, userId, platform) {
    const rule = new schedule.RecurrenceRule();
    if (recurrence === 'daily') {
      rule.dayOfWeek = [0, 1, 2, 3, 4, 5, 6];
      rule.hour = new Date(scheduleTime).getHours();
      rule.minute = new Date(scheduleTime).getMinutes();
    } else if (recurrence === 'weekly') {
      rule.dayOfWeek = new Date(scheduleTime).getDay();
      rule.hour = new Date(scheduleTime).getHours();
      rule.minute = new Date(scheduleTime).getMinutes();
    }

    const job = schedule.scheduleJob(rule, async () => {
      await redis.enqueueCall({
        type: 'scheduled',
        call: { id: callId, phone_number: phoneNumber, message, user_id: userId, platform }
      });
    });
    this.jobs.set(callId, job);
  }

  async cancelScheduledCall(callId, userId) {
    const call = await db.get(`SELECT * FROM scheduled_calls WHERE id = ? AND user_id = ?`, [callId, userId]);
    if (!call) throw new Error('Scheduled call not found or not authorized');

    await db.run(`UPDATE scheduled_calls SET status = 'cancelled' WHERE id = ?`, [callId]);
    const job = this.jobs.get(callId);
    if (job) {
      job.cancel();
      this.jobs.delete(callId);
    }

    await bot.api.sendMessage(userId, `Scheduled call (ID: ${callId}) has been cancelled.`);
    logger.info(`Cancelled scheduled call: ${callId}`);
  }

  async rescheduleCall(callId, newTime, userId) {
    const call = await db.get(`SELECT * FROM scheduled_calls WHERE id = ? AND user_id = ?`, [callId, userId]);
    if (!call) throw new Error('Scheduled call not found or not authorized');

    const formattedTime = new Date(newTime).toISOString();
    await db.run(`UPDATE scheduled_calls SET schedule_time = ?, status = 'pending' WHERE id = ?`, [formattedTime, callId]);

    const job = this.jobs.get(callId);
    if (job) job.reschedule(formattedTime);

    await bot.api.sendMessage(userId, `Scheduled call (ID: ${callId}) rescheduled to ${formattedTime}.`);
    logger.info(`Rescheduled call: ${callId} to ${formattedTime}`);
  }

  async executeScheduledCall(call) {
    try {
      const callResult = await twilioClient.makeOutboundCall(call.phone_number, call.platform, call.message);
      await db.run(`UPDATE scheduled_calls SET status = 'completed' WHERE id = ?`, [call.id]);
      await db.run(
        `INSERT INTO call_history (user_id, phone_number, call_sid, status, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [call.user_id, call.phone_number, callResult.sid, 'completed', new Date().toISOString()]
      );
      await bot.api.sendMessage(call.user_id, `Scheduled call (ID: ${call.id}) to ${call.phone_number} completed. Call SID: ${callResult.sid}`);
      logger.info(`Scheduled call executed: ${call.id}`);
    } catch (error) {
      logger.error(`Scheduled call failed: ${error.message}`, { callId: call.id });
      await db.run(`UPDATE scheduled_calls SET status = 'failed' WHERE id = ?`, [call.id]);
      await bot.api.sendMessage(call.user_id, `Scheduled call (ID: ${call.id}) to ${call.phone_number} failed. Error: ${error.message}`);
    }
  }

  async executeImmediateCall(call) {
    try {
      const callResult = await twilioClient.makeOutboundCall(call.phoneNumber, call.platform, call.message, call.language);
      await db.run(
        `INSERT INTO call_history (user_id, phone_number, call_sid, status, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [call.userId, call.phoneNumber, callResult.sid, 'completed', new Date().toISOString()]
      );
      await bot.api.sendMessage(call.userId, `Immediate call to ${call.phoneNumber} completed. Call SID: ${callResult.sid}`);
    } catch (error) {
      logger.error(`Immediate call failed: ${error.message}`, { phoneNumber: call.phoneNumber });
      await db.run(
        `INSERT INTO call_history (user_id, phone_number, call_sid, status, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [call.userId, call.phoneNumber, null, 'failed', new Date().toISOString()]
      );
      await bot.api.sendMessage(call.userId, `Immediate call to ${call.phoneNumber} failed. Error: ${error.message}`);
    }
  }
}

module.exports = new CallScheduler();