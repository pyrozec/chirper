const assert = require('assert');
const twilioClient = require('../../api/twilioClient');

describe('Twilio Client Integration', () => {
    it('should send a message successfully', async () => {
        const response = await twilioClient.sendMessage('to', 'from', 'body');
        assert.strictEqual(response.status, 'sent');
    });

    it('should throw an error for invalid parameters', async () => {
        await assert.rejects(async () => {
            await twilioClient.sendMessage('', '', '');
        }, {
            name: 'Error',
            message: 'Invalid parameters'
        });
    });
});