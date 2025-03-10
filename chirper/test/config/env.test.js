const assert = require('assert');
const env = process.env;

describe('Environment Variables', () => {
    it('should have the required environment variables set', () => {
        assert.ok(env.TWILIO_ACCOUNT_SID, 'TWILIO_ACCOUNT_SID is not set');
        assert.ok(env.TWILIO_AUTH_TOKEN, 'TWILIO_AUTH_TOKEN is not set');
        assert.ok(env.DB_CONNECTION_STRING, 'DB_CONNECTION_STRING is not set');
        assert.ok(env.REDIS_URL, 'REDIS_URL is not set');
    });
});