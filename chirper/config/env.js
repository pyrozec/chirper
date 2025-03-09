const dotenv = require('dotenv');

dotenv.config();

const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'TWILIO_CALLBACK_URL',
  'TELEGRAM_BOT_TOKEN',
  'PORT',
  'AUTHORIZED_USERS',
  'DATABASE_PATH',
  'GOOGLE_CREDENTIALS_PATH',
  'SUPPORTED_LANGUAGES',
  'REDIS_URL',
  'WEATHER_API_KEY',
  'WEATHER_DEFAULT_CITY',
  'OTP_CHANNEL_ID',
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

module.exports = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    callbackUrl: process.env.TWILIO_CALLBACK_URL,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    authorizedUsers: process.env.AUTHORIZED_USERS.split(',').map(Number),
  },
  server: {
    port: process.env.PORT || 3000,
  },
  database: {
    path: process.env.DATABASE_PATH,
  },
  google: {
    credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH,
  },
  languages: {
    supported: process.env.SUPPORTED_LANGUAGES.split(','),
    default: 'en',
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  weather: {
    apiKey: process.env.WEATHER_API_KEY,
    defaultCity: process.env.WEATHER_DEFAULT_CITY,
  },
  otpChannelId: process.env.OTP_CHANNEL_ID,
};