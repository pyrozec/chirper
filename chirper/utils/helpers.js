const logger = require('./logger');

const validatePhoneNumber = (phoneNumber) => {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
};

const retry = async (fn, retries, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      logger.warn(`Retry attempt ${i + 1} failed: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

module.exports = {
  validatePhoneNumber,
  retry,
};