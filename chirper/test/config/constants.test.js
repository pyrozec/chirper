const assert = require('assert');
const constants = require('../../config/constants');

describe('Constants', () => {
    it('should have the expected values', () => {
        assert.strictEqual(constants.EXAMPLE_CONSTANT, 'expectedValue');
    });
});