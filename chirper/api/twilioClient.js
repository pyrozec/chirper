const Twilio = require('twilio');
const config = require('../config/env');
const logger = require('../utils/logger');
const helpers = require('../utils/helpers');
const constants = require('../config/constants');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const translate = require('google-translate-api-x');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class TwilioClient {
  constructor() {
    this.client = new Twilio(config.twilio.accountSid, config.twilio.authToken);
    this.ttsClient = new TextToSpeechClient({ keyFilename: config.google.credentialsPath });
  }

  async makeOutboundCall(to, platform = null, message = null, language = 'en', customAudioUrl = null, retries = 3) {
    let twimlMessage;

    if (platform && constants.SUPPORTED_PLATFORMS[platform]) {
      const platformMessage = constants.SUPPORTED_PLATFORMS[platform];
      twimlMessage = constants.DEFAULT_TWIML_MESSAGE(platformMessage);
    } else if (customAudioUrl) {
      twimlMessage = `
        <Response>
          <Play>${customAudioUrl}</Play>
          <Gather input="dtmf" timeout="10" numDigits="6" finishOnKey="#" action="${config.twilio.callbackUrl}/otp" method="POST" />
          <Say voice="Polly.Joanna">We did not receive your input. Goodbye.</Say>
        </Response>
      `;
    } else {
      let finalMessage = message || 'Hello from your Telegram bot!';
      if (message && message.includes('{weather}')) {
        const weather = await this.getWeather();
        finalMessage = message.replace('{weather}', weather);
      }

      const translatedMessage = language !== 'en'
        ? (await translate(finalMessage, { to: language })).text
        : finalMessage;

      const audioUrl = await this.generateAudio(translatedMessage, language);
      twimlMessage = `
        <Response>
          <Play>${audioUrl}</Play>
          <Gather input="dtmf" timeout="10" numDigits="6" finishOnKey="#" action="${config.twilio.callbackUrl}/otp" method="POST" />
          <Say voice="Polly.Joanna">We did not receive your input. Goodbye.</Say>
        </Response>
      `;
    }

    const fn = async () => {
      const call = await this.client.calls.create({
        to,
        from: config.twilio.phoneNumber,
        twiml: twimlMessage,
        timeout: 30,
        record: true,
        statusCallback: config.twilio.callbackUrl + '/status',
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      });
      logger.info(`Outbound call initiated: ${call.sid}`, { to });
      return call;
    };

    return helpers.retry(fn, retries);
  }

  async generateAudio(text, language) {
    const request = {
      input: { text },
      voice: { languageCode: language, ssmlGender: 'NEUTRAL' },
      audioConfig: { audioEncoding: 'MP3' },
    };

    const [response] = await this.ttsClient.synthesizeSpeech(request);
    const fileName = `audio_${Date.now()}.mp3`;
    const filePath = path.join(__dirname, '..', '..', 'public', fileName);
    await fs.writeFile(filePath, response.audioContent, 'binary');

    return `${config.twilio.callbackUrl}/public/${fileName}`;
  }

  async getWeather(city = config.weather.defaultCity) {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${config.weather.apiKey}&units=metric`
      );
      const weather = response.data.weather[0].description;
      const temp = response.data.main.temp;
      return `The weather in ${city} is ${weather} with a temperature of ${temp} degrees Celsius.`;
    } catch (error) {
      logger.error(`Weather API error: ${error.message}`);
      return 'Weather information unavailable.';
    }
  }
}

module.exports = new TwilioClient();
